from django.db.models import OuterRef, Q, Subquery
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .models import (
    CourierAttachment,
    CourierBoxAttachment,
    CourierComment,
    CourierDelivery,
    DayNote,
    OneCEvent,
    OneCImportBatch,
    Task,
    TaskAttachment,
    TaskComment,
    WorkRequest,
)
from .serializers import (
    CourierAttachmentSerializer,
    CourierBoxAttachmentSerializer,
    CourierCommentSerializer,
    CourierDeliverySerializer,
    DayNoteSerializer,
    OneCEventSerializer,
    OneCImportBatchSerializer,
    TaskAttachmentSerializer,
    TaskCommentSerializer,
    TaskSerializer,
    WorkRequestSerializer,
)


class WorkRequestViewSet(viewsets.ModelViewSet):
    queryset = WorkRequest.objects.all()
    serializer_class = WorkRequestSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(number__icontains=search.strip().upper())
        return queryset


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.prefetch_related('requests', 'comments', 'attachments').all()
    serializer_class = TaskSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        date = self.request.query_params.get('date')
        status = self.request.query_params.get('status')
        today = self.request.query_params.get('today')
        undated = self.request.query_params.get('undated')

        if today == '1':
            queryset = queryset.filter(planned_date=timezone.localdate())
        if date:
            queryset = queryset.filter(planned_date=date)
        if status:
            queryset = queryset.filter(status=status)
        if undated == '1':
            queryset = queryset.filter(planned_date__isnull=True)
        return queryset

    @action(detail=False, methods=['get'])
    def today(self, request):
        queryset = self.get_queryset().filter(planned_date=timezone.localdate())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class CourierDeliveryViewSet(viewsets.ModelViewSet):
    queryset = CourierDelivery.objects.prefetch_related(
        'boxes__requests', 'boxes__attachments', 'comments', 'attachments'
    ).all()
    serializer_class = CourierDeliverySerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        status = self.request.query_params.get('status')
        date = self.request.query_params.get('date')
        today = self.request.query_params.get('today')
        active = self.request.query_params.get('active')

        if status:
            queryset = queryset.filter(status=status)
        if date:
            queryset = queryset.filter(Q(expected_date=date) | Q(dispatch_date=date) | Q(received_date=date))
        if today == '1':
            today_date = timezone.localdate()
            queryset = queryset.filter(Q(expected_date=today_date) | Q(dispatch_date=today_date))
        if active == '1':
            queryset = queryset.exclude(status__in=[CourierDelivery.Status.DONE, CourierDelivery.Status.CANCELLED])
        return queryset

    @action(detail=False, methods=['get'])
    def today(self, request):
        today_date = timezone.localdate()
        queryset = self.get_queryset().filter(Q(expected_date=today_date) | Q(dispatch_date=today_date))
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class TaskCommentViewSet(viewsets.ModelViewSet):
    queryset = TaskComment.objects.select_related('task').all()
    serializer_class = TaskCommentSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        task_id = self.request.query_params.get('task')
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        return queryset


class CourierCommentViewSet(viewsets.ModelViewSet):
    queryset = CourierComment.objects.select_related('delivery').all()
    serializer_class = CourierCommentSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        delivery_id = self.request.query_params.get('delivery')
        if delivery_id:
            queryset = queryset.filter(delivery_id=delivery_id)
        return queryset


class TaskAttachmentViewSet(viewsets.ModelViewSet):
    queryset = TaskAttachment.objects.select_related('task').all()
    serializer_class = TaskAttachmentSerializer
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        uploaded_file = self.request.FILES.get('file')
        serializer.save(original_name=getattr(uploaded_file, 'name', ''))

    def get_queryset(self):
        queryset = super().get_queryset()
        task_id = self.request.query_params.get('task')
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        return queryset


class CourierAttachmentViewSet(viewsets.ModelViewSet):
    queryset = CourierAttachment.objects.select_related('delivery').all()
    serializer_class = CourierAttachmentSerializer
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        uploaded_file = self.request.FILES.get('file')
        serializer.save(original_name=getattr(uploaded_file, 'name', ''))

    def get_queryset(self):
        queryset = super().get_queryset()
        delivery_id = self.request.query_params.get('delivery')
        if delivery_id:
            queryset = queryset.filter(delivery_id=delivery_id)
        return queryset


class CourierBoxAttachmentViewSet(viewsets.ModelViewSet):
    queryset = CourierBoxAttachment.objects.select_related('box', 'box__delivery').all()
    serializer_class = CourierBoxAttachmentSerializer
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        uploaded_file = self.request.FILES.get('file')
        serializer.save(original_name=getattr(uploaded_file, 'name', ''))

    def get_queryset(self):
        queryset = super().get_queryset()
        box_id = self.request.query_params.get('box')
        if box_id:
            queryset = queryset.filter(box_id=box_id)
        return queryset


class DayNoteViewSet(viewsets.ModelViewSet):
    queryset = DayNote.objects.all()
    serializer_class = DayNoteSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        date = self.request.query_params.get('date')
        start = self.request.query_params.get('start')
        end = self.request.query_params.get('end')
        if date:
            queryset = queryset.filter(date=date)
        if start:
            queryset = queryset.filter(date__gte=start)
        if end:
            queryset = queryset.filter(date__lte=end)
        return queryset



class OneCImportBatchViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = OneCImportBatch.objects.all()
    serializer_class = OneCImportBatchSerializer
    parser_classes = [MultiPartParser, FormParser]

    @action(detail=False, methods=['post'], url_path='upload')
    def upload(self, request):
        from .onec_services import import_onec_xlsx

        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response({'file': 'Передайте файл .xlsx в поле file.'}, status=status.HTTP_400_BAD_REQUEST)
        if not uploaded_file.name.lower().endswith('.xlsx'):
            return Response({'file': 'Сейчас поддерживается формат .xlsx.'}, status=status.HTTP_400_BAD_REQUEST)

        batch = import_onec_xlsx(uploaded_file, uploaded_file.name)
        serializer = self.get_serializer(batch)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class OneCEventViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = OneCEvent.objects.select_related('import_batch').all()
    serializer_class = OneCEventSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search') or self.request.query_params.get('q')
        invoice = self.request.query_params.get('invoice') or self.request.query_params.get('invoice_number')
        status_code = self.request.query_params.get('status') or self.request.query_params.get('status_code')
        own_lab = self.request.query_params.get('own_lab')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        latest = self.request.query_params.get('latest')

        if search:
            value = search.strip()
            queryset = queryset.filter(
                Q(invoice_number__icontains=value)
                | Q(invoice_raw__icontains=value)
                | Q(counterparty__icontains=value)
                | Q(consignee__icontains=value)
                | Q(service_name__icontains=value)
                | Q(work_description__icontains=value)
                | Q(barcode__icontains=value)
                | Q(responsible_full_name__icontains=value)
                | Q(status_raw__icontains=value)
            )
        if invoice:
            queryset = queryset.filter(invoice_number__icontains=invoice.strip().upper())
        if status_code:
            queryset = queryset.filter(status_code=status_code)
        if own_lab in ('1', 'true', 'True'):
            queryset = queryset.filter(is_own_lab=True)
        if own_lab in ('0', 'false', 'False'):
            queryset = queryset.filter(is_own_lab=False)
        if date_from:
            queryset = queryset.filter(event_datetime__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(event_datetime__date__lte=date_to)
        if latest == '1':
            latest_ids = OneCEvent.objects.filter(
                instrument_key=OuterRef('instrument_key')
            ).order_by('-event_datetime', '-id').values('id')[:1]
            queryset = queryset.filter(id=Subquery(latest_ids))
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        try:
            page = max(int(request.query_params.get('page', '1')), 1)
        except ValueError:
            page = 1
        try:
            page_size = int(request.query_params.get('page_size', request.query_params.get('limit', '50')))
        except ValueError:
            page_size = 50
        page_size = min(max(page_size, 1), 500)
        total = queryset.count()
        offset = (page - 1) * page_size
        page_queryset = queryset[offset:offset + page_size]
        serializer = self.get_serializer(page_queryset, many=True)
        total_pages = (total + page_size - 1) // page_size if total else 1
        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'total_pages': total_pages,
            'next': page + 1 if page < total_pages else None,
            'previous': page - 1 if page > 1 else None,
            'results': serializer.data,
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        from .onec_services import build_onec_stats

        try:
            history_days = int(request.query_params.get('history_days', '90'))
        except ValueError:
            history_days = 90
        history_days = min(max(history_days, 1), 365)
        return Response(build_onec_stats(history_days=history_days))

    @action(detail=False, methods=['get'])
    def vitrines(self, request):
        from .onec_services import build_onec_vitrines

        return Response(build_onec_vitrines(request.query_params))

    @action(detail=False, methods=['get'], url_path='dictionaries')
    def dictionaries(self, request):
        from .onec_services import get_onec_dictionaries

        return Response(get_onec_dictionaries())

    @action(detail=False, methods=['get'], url_path='status-choices')
    def status_choices(self, request):
        from .onec_services import get_business_status_choices

        include_other = request.query_params.get('include_other') in ('1', 'true', 'True')
        return Response(get_business_status_choices(include_other=include_other))
