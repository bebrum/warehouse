from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import (
    CourierAttachment,
    CourierBox,
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
    normalize_request_number,
    request_number_validator,
)


def validate_request_number(value):
    number = normalize_request_number(value)
    try:
        request_number_validator(number)
    except DjangoValidationError as exc:
        raise serializers.ValidationError(exc.messages[0])
    return number


def validate_request_number_list(values):
    cleaned = []
    errors = []
    for raw_number in values or []:
        raw_number = (raw_number or '').strip()
        if not raw_number:
            continue
        try:
            number = validate_request_number(raw_number)
        except serializers.ValidationError:
            errors.append(raw_number)
            continue
        if number not in cleaned:
            cleaned.append(number)
    if errors:
        raise serializers.ValidationError(
            f'Неверный формат номера: {", ".join(errors)}. Нужно как В3-00516/26.'
        )
    return cleaned


def get_or_create_requests(numbers):
    request_objects = []
    for number in numbers:
        obj, _ = WorkRequest.objects.get_or_create(number=number)
        request_objects.append(obj)
    return request_objects


class WorkRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkRequest
        fields = ['id', 'number', 'title', 'note', 'created_at', 'updated_at']

    def validate_number(self, value):
        return validate_request_number(value)


class TaskCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskComment
        fields = ['id', 'task', 'text', 'created_at']
        read_only_fields = ['created_at']


class TaskAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskAttachment
        fields = ['id', 'task', 'file', 'original_name', 'uploaded_at']
        read_only_fields = ['original_name', 'uploaded_at']


class TaskSerializer(serializers.ModelSerializer):
    requests = WorkRequestSerializer(many=True, read_only=True)
    request_numbers = serializers.ListField(
        child=serializers.CharField(max_length=32),
        write_only=True,
        required=False,
        help_text='Список номеров заявок/счетов, например ["В3-00516/26", "Б7-00001/25"]',
    )
    comments = TaskCommentSerializer(many=True, read_only=True)
    attachments = TaskAttachmentSerializer(many=True, read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'status', 'status_label',
            'planned_date', 'planned_time', 'requests', 'request_numbers',
            'comments', 'attachments', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate_request_numbers(self, value):
        return validate_request_number_list(value)

    def _sync_requests(self, task, numbers):
        if numbers is None:
            return
        task.requests.set(get_or_create_requests(numbers))

    def create(self, validated_data):
        numbers = validated_data.pop('request_numbers', None)
        task = Task.objects.create(**validated_data)
        self._sync_requests(task, numbers)
        return task

    def update(self, instance, validated_data):
        numbers = validated_data.pop('request_numbers', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        self._sync_requests(instance, numbers)
        return instance


class CourierCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourierComment
        fields = ['id', 'delivery', 'text', 'created_at']
        read_only_fields = ['created_at']


class CourierAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourierAttachment
        fields = ['id', 'delivery', 'file', 'original_name', 'uploaded_at']
        read_only_fields = ['original_name', 'uploaded_at']


class CourierBoxAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourierBoxAttachment
        fields = ['id', 'box', 'file', 'original_name', 'uploaded_at']
        read_only_fields = ['original_name', 'uploaded_at']


class CourierBoxSerializer(serializers.ModelSerializer):
    requests = WorkRequestSerializer(many=True, read_only=True)
    attachments = CourierBoxAttachmentSerializer(many=True, read_only=True)
    request_numbers = serializers.ListField(
        child=serializers.CharField(max_length=32),
        write_only=True,
        required=False,
    )

    class Meta:
        model = CourierBox
        fields = ['id', 'box_code', 'note', 'requests', 'request_numbers', 'attachments', 'created_at']
        read_only_fields = ['created_at']


class CourierBoxInputSerializer(serializers.Serializer):
    box_code = serializers.CharField(max_length=120, required=False, allow_blank=True)
    note = serializers.CharField(required=False, allow_blank=True)
    request_numbers = serializers.ListField(
        child=serializers.CharField(max_length=32),
        allow_empty=False,
        help_text='В каждой коробке должен быть хотя бы один номер заявки/счёта.',
    )

    def validate_request_numbers(self, value):
        numbers = validate_request_number_list(value)
        if not numbers:
            raise serializers.ValidationError('У коробки должен быть хотя бы один номер заявки/счёта.')
        return numbers


class CourierDeliverySerializer(serializers.ModelSerializer):
    boxes = CourierBoxSerializer(many=True, read_only=True)
    boxes_data = CourierBoxInputSerializer(many=True, write_only=True, required=False)
    comments = CourierCommentSerializer(many=True, read_only=True)
    attachments = CourierAttachmentSerializer(many=True, read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    all_request_numbers = serializers.SerializerMethodField()

    class Meta:
        model = CourierDelivery
        fields = [
            'id', 'title', 'description', 'status', 'status_label',
            'expected_date', 'received_date', 'dispatch_date', 'dispatch_time',
            'courier_name', 'tracking_number', 'sender', 'recipient', 'storage_place',
            'boxes', 'boxes_data', 'all_request_numbers', 'comments', 'attachments',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_all_request_numbers(self, obj):
        numbers = []
        for box in obj.boxes.all():
            for request in box.requests.all():
                if request.number not in numbers:
                    numbers.append(request.number)
        return numbers

    def validate_boxes_data(self, value):
        if value is not None and len(value) == 0:
            raise serializers.ValidationError('Добавьте хотя бы одну коробку или не передавайте boxes_data.')
        return value

    def validate(self, attrs):
        if self.instance is None and not attrs.get('boxes_data'):
            raise serializers.ValidationError({'boxes_data': 'Для новой доставки добавьте хотя бы одну коробку.'})
        return attrs

    def _replace_boxes(self, delivery, boxes_data):
        if boxes_data is None:
            return
        delivery.boxes.all().delete()
        for index, box_data in enumerate(boxes_data, start=1):
            numbers = box_data.pop('request_numbers')
            box_code = box_data.get('box_code') or f'Коробка {index}'
            box = CourierBox.objects.create(
                delivery=delivery,
                box_code=box_code,
                note=box_data.get('note', ''),
            )
            box.requests.set(get_or_create_requests(numbers))

    def create(self, validated_data):
        boxes_data = validated_data.pop('boxes_data', [])
        delivery = CourierDelivery.objects.create(**validated_data)
        self._replace_boxes(delivery, boxes_data)
        return delivery

    def update(self, instance, validated_data):
        boxes_data = validated_data.pop('boxes_data', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        self._replace_boxes(instance, boxes_data)
        return instance


class DayNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DayNote
        fields = ['id', 'date', 'text', 'updated_at']
        read_only_fields = ['updated_at']



class OneCImportBatchSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = OneCImportBatch
        fields = [
            'id', 'original_name', 'file', 'status', 'status_label',
            'rows_total', 'rows_created', 'rows_skipped_duplicates', 'rows_invalid',
            'invalid_rows_preview', 'error_message', 'uploaded_at', 'finished_at',
        ]
        read_only_fields = fields


class OneCEventSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source='get_status_code_display', read_only=True)
    import_original_name = serializers.CharField(source='import_batch.original_name', read_only=True)

    class Meta:
        model = OneCEvent
        fields = [
            'id', 'import_batch', 'import_original_name', 'event_datetime',
            'invoice_raw', 'invoice_number', 'invoice_prefix', 'is_own_lab',
            'counterparty', 'consignee', 'service_name', 'work_description',
            'quantity', 'status_raw', 'status_code', 'status_label', 'barcode',
            'responsible_full_name', 'instrument_key', 'source_row_number', 'created_at',
        ]
        read_only_fields = fields
