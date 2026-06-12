from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Count
from .models import DemandeCredit
from .serializers import DemandeCreditSerializer

class DemandeCreditViewSet(viewsets.ModelViewSet):
    serializer_class = DemandeCreditSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['AGENT_TERRAIN', 'ADMINISTRATEUR']:
            return DemandeCredit.objects.all().order_by('-created_at')
        return DemandeCredit.objects.filter(client=user).order_by('-created_at')

    def perform_create(self, serializer):
        demande = serializer.save(client=self.request.user, statut='SOUMISE')
        
        # Calcul automatique d'un score d'éligibilité simplifié
        # Logique : Base 100, on soustrait 1 point pour chaque 10 000 FCFA demandés au delà de 50 000
        # et on ajuste selon la durée (ex: -1 par mois supplémentaire au delà de 3)
        score_base = 100
        montant = float(demande.montant_demande)
        duree = int(demande.duree_mois)
        
        malus_montant = max(0, (montant - 50000) / 10000)
        malus_duree = max(0, duree - 3) * 2
        
        score_final = max(0, min(100, int(score_base - malus_montant - malus_duree)))
        demande.score_eligibilite = score_final
        demande.save()

    @action(detail=True, methods=['post'])
    def analyser(self, request, pk=None):
        if request.user.role not in ['AGENT_TERRAIN', 'ADMINISTRATEUR'] and not request.user.is_superuser:
            return Response({'detail': f"Non autorisé. Rôle actuel: '{request.user.role}'"}, status=status.HTTP_403_FORBIDDEN)
        
        demande = self.get_object()
        if demande.statut != 'SOUMISE':
            return Response({'detail': f"Impossible d'analyser une demande au statut {demande.statut}."}, status=status.HTTP_400_BAD_REQUEST)
            
        demande.statut = 'EN_ANALYSE'
        demande.agent_analyse = request.user
        demande.date_analyse = timezone.now()
        if 'note' in request.data:
            demande.note_decision = request.data['note']
        demande.save()
        
        from notifications.models import Notification
        Notification.objects.create(
            utilisateur=demande.client,
            type_alerte='CREDIT',
            message=f"Votre demande de crédit de {demande.montant_demande} FCFA est passée au statut : EN ANALYSE."
        )
        return Response({'status': 'Demande passée en analyse avec succès.'})

    @action(detail=True, methods=['post'])
    def approuver(self, request, pk=None):
        if request.user.role not in ['AGENT_TERRAIN', 'ADMINISTRATEUR'] and not request.user.is_superuser:
            return Response({'detail': f"Non autorisé. Rôle actuel: '{request.user.role}'"}, status=status.HTTP_403_FORBIDDEN)
        
        demande = self.get_object()
        if demande.statut != 'EN_ANALYSE':
            return Response({'detail': f"Impossible d'approuver une demande au statut {demande.statut}. Elle doit d'abord être en analyse."}, status=status.HTTP_400_BAD_REQUEST)
            
        demande.statut = 'APPROUVEE'
        demande.admin_approbation = request.user
        demande.date_approbation = timezone.now()
        if 'note' in request.data:
            demande.note_decision = request.data['note']
        demande.save()
        
        from notifications.models import Notification
        Notification.objects.create(
            utilisateur=demande.client,
            type_alerte='CREDIT',
            message=f"Félicitations, votre demande de crédit de {demande.montant_demande} FCFA a été APPROUVÉE."
        )
        return Response({'status': 'Demande approuvée avec succès.'})

    @action(detail=True, methods=['post'])
    def rejeter(self, request, pk=None):
        if request.user.role not in ['AGENT_TERRAIN', 'ADMINISTRATEUR'] and not request.user.is_superuser:
            return Response({'detail': f"Non autorisé. Rôle actuel: '{request.user.role}'"}, status=status.HTTP_403_FORBIDDEN)
        
        demande = self.get_object()
        if demande.statut in ['DECAISSEE', 'APPROUVEE']:
            return Response({'detail': "Impossible de rejeter une demande déjà décaissée ou approuvée."}, status=status.HTTP_400_BAD_REQUEST)
            
        demande.statut = 'REJETEE'
        if 'note' in request.data:
            demande.note_decision = request.data['note']
        demande.save()

        from notifications.models import Notification
        Notification.objects.create(
            utilisateur=demande.client,
            type_alerte='CREDIT',
            message=f"Votre demande de crédit de {demande.montant_demande} FCFA a été REJETÉE."
        )
        return Response({'status': 'Demande rejetée.'})

    @action(detail=True, methods=['post'])
    def decaisser(self, request, pk=None):
        if request.user.role not in ['AGENT_TERRAIN', 'ADMINISTRATEUR'] and not request.user.is_superuser:
            return Response({'detail': f"Non autorisé. Rôle actuel: '{request.user.role}'"}, status=status.HTTP_403_FORBIDDEN)
        
        demande = self.get_object()
        if demande.statut != 'APPROUVEE':
            return Response({'detail': "La demande doit d'abord être approuvée."}, status=status.HTTP_400_BAD_REQUEST)
        
        demande.statut = 'DECAISSEE'
        demande.save()

        # Génération automatique des échéanciers
        from remboursements.models import Echeancier
        import datetime

        montant_par_mois = demande.montant_demande / demande.duree_mois
        current_date = timezone.now().date()
        for i in range(1, demande.duree_mois + 1):
            month = current_date.month - 1 + i
            year = current_date.year + month // 12
            month = month % 12 + 1
            day = min(current_date.day, [31,
                29 if year % 4 == 0 and not year % 400 == 0 else 28,
                31,30,31,30,31,31,30,31,30,31][month-1])
            date_echeance = datetime.date(year, month, day)
            Echeancier.objects.create(
                demande_credit=demande,
                date_echeance=date_echeance,
                montant_attendu=montant_par_mois,
                statut='EN_ATTENTE'
            )

        from notifications.models import Notification
        Notification.objects.create(
            utilisateur=demande.client,
            type_alerte='CREDIT',
            message=f"Les fonds de votre crédit de {demande.montant_demande} FCFA ont été DÉCAISSÉS. Votre échéancier est disponible."
        )

        return Response({'status': 'Fonds décaissés et échéanciers générés.'})

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        from django.db.models.functions import TruncDate
        
        user = request.user
        days_param = request.query_params.get('days', '30')
        try:
            days = int(days_param)
        except ValueError:
            days = 30
            
        start_date = timezone.now() - timezone.timedelta(days=days)

        if user.role in ['AGENT_TERRAIN', 'ADMINISTRATEUR']:
            qs = DemandeCredit.objects.all()
            qs_trend = DemandeCredit.objects.filter(created_at__gte=start_date)
        else:
            qs = DemandeCredit.objects.filter(client=user)
            qs_trend = DemandeCredit.objects.filter(client=user, created_at__gte=start_date)

        total_demandes = qs.count()
        en_attente = qs.filter(statut='SOUMISE').count()
        en_analyse = qs.filter(statut='EN_ANALYSE').count()
        approuvees = qs.filter(statut='APPROUVEE').count()
        rejetees = qs.filter(statut='REJETEE').count()

        montant_total = qs.filter(statut__in=['APPROUVEE', 'DECAISSEE']).aggregate(total=Sum('montant_demande'))['total'] or 0
        montant_en_attente = qs.filter(statut__in=['SOUMISE', 'EN_ANALYSE']).aggregate(total=Sum('montant_demande'))['total'] or 0

        trend_qs = qs_trend.annotate(date=TruncDate('created_at')).values('date', 'statut').annotate(count=Count('id')).order_by('date')
        
        trend_data = {}
        for item in trend_qs:
            d = item['date'].strftime('%Y-%m-%d')
            s = item['statut']
            c = item['count']
            if d not in trend_data:
                trend_data[d] = {'SOUMISE': 0, 'EN_ANALYSE': 0, 'APPROUVEE': 0, 'REJETEE': 0}
            if s in trend_data[d]:
                trend_data[d][s] = c

        # Remplir les jours manquants pour un beau graphe
        import datetime
        final_trend = []
        for i in range(days):
            d = (timezone.now() - datetime.timedelta(days=days - 1 - i)).strftime('%Y-%m-%d')
            if d in trend_data:
                final_trend.append({'date': d, **trend_data[d]})
            else:
                final_trend.append({'date': d, 'SOUMISE': 0, 'EN_ANALYSE': 0, 'APPROUVEE': 0, 'REJETEE': 0})

        return Response({
            'total_demandes': total_demandes,
            'en_attente': en_attente,
            'en_analyse': en_analyse,
            'approuvees': approuvees,
            'rejetees': rejetees,
            'montant_total': montant_total,
            'montant_en_attente': montant_en_attente,
            'trend': final_trend
        })

    @action(detail=False, methods=['get'])
    def admin_dashboard(self, request):
        if request.user.role != 'ADMINISTRATEUR' and not request.user.is_superuser:
            return Response({'detail': "Réservé aux administrateurs."}, status=status.HTTP_403_FORBIDDEN)

        from django.db.models import Sum, Count
        from remboursements.models import Echeancier
        from assurances.models import Souscription
        from support_client.models import Conversation

        # Filtres
        agent_id = request.query_params.get('agent_id')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        demandes_qs = DemandeCredit.objects.all()
        if agent_id:
            demandes_qs = demandes_qs.filter(agent_analyse_id=agent_id)
        if start_date:
            demandes_qs = demandes_qs.filter(created_at__gte=start_date)
        if end_date:
            demandes_qs = demandes_qs.filter(created_at__lte=end_date)

        # Volume demandes
        volume_demandes = list(demandes_qs.values('statut').annotate(count=Count('id')))
        
        # Taux de recouvrement
        echeanciers = Echeancier.objects.all()
        montant_attendu = echeanciers.filter(statut__in=['PAYE', 'EN_RETARD']).aggregate(tot=Sum('montant_attendu'))['tot'] or 0
        montant_paye = echeanciers.filter(statut='PAYE').aggregate(tot=Sum('montant_attendu'))['tot'] or 0
        taux_recouvrement = (float(montant_paye) / float(montant_attendu) * 100) if montant_attendu > 0 else 0

        # Souscriptions actives
        souscriptions_actives = Souscription.objects.filter(statut='ACTIVE').count()

        # Conversations ouvertes
        conversations_ouvertes = Conversation.objects.count()

        return Response({
            'volume_demandes': volume_demandes,
            'taux_recouvrement': round(taux_recouvrement, 2),
            'montant_attendu': montant_attendu,
            'montant_paye': montant_paye,
            'souscriptions_actives': souscriptions_actives,
            'conversations_ouvertes': conversations_ouvertes
        })

