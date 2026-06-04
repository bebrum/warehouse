from django.core.validators import RegexValidator
from django.db import models

REQUEST_NUMBER_PATTERN = r'^[A-ZА-ЯЁ]\d-\d{5}/\d{2}$'

request_number_validator = RegexValidator(
    regex=REQUEST_NUMBER_PATTERN,
    message='Номер заявки/счёта должен быть в формате В3-00516/26: буква, цифра, дефис, 5 цифр, слэш, 2 цифры.',
)


def normalize_request_number(value: str) -> str:
    return (value or '').strip().upper()


class WorkRequest(models.Model):
    number = models.CharField(
        max_length=16,
        unique=True,
        validators=[request_number_validator],
        verbose_name='Номер заявки/счёта',
    )
    title = models.CharField(max_length=255, blank=True, verbose_name='Краткое описание')
    note = models.TextField(blank=True, verbose_name='Примечание')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['number']
        verbose_name = 'Заявка/счёт'
        verbose_name_plural = 'Заявки/счета'

    def clean(self):
        self.number = normalize_request_number(self.number)
        super().clean()

    def save(self, *args, **kwargs):
        self.number = normalize_request_number(self.number)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.number


class Task(models.Model):
    class Status(models.TextChoices):
        NOT_STARTED = 'not_started', 'Не начато'
        IN_PROGRESS = 'in_progress', 'Начато'
        DONE = 'done', 'Выполнено'

    title = models.CharField(max_length=255, verbose_name='Поручение')
    description = models.TextField(blank=True, verbose_name='Описание')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NOT_STARTED,
        db_index=True,
        verbose_name='Статус',
    )
    planned_date = models.DateField(null=True, blank=True, db_index=True, verbose_name='Дата')
    planned_time = models.TimeField(null=True, blank=True, verbose_name='Время')
    requests = models.ManyToManyField(
        WorkRequest,
        blank=True,
        related_name='tasks',
        verbose_name='Связанные заявки/счета',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['planned_date', 'planned_time', '-created_at']
        verbose_name = 'Задача'
        verbose_name_plural = 'Задачи'

    def __str__(self):
        return self.title


class CourierDelivery(models.Model):
    class Status(models.TextChoices):
        EXPECTED = 'expected', 'Ожидается'
        RECEIVED = 'received', 'Принята'
        ASSEMBLING = 'assembling', 'Собирается к отправке'
        READY = 'ready', 'Готова к отправке'
        SHIPPED = 'shipped', 'Отправлена'
        DONE = 'done', 'Завершена'
        CANCELLED = 'cancelled', 'Отменена'

    title = models.CharField(max_length=255, verbose_name='Название доставки')
    description = models.TextField(blank=True, verbose_name='Описание')
    status = models.CharField(
        max_length=24,
        choices=Status.choices,
        default=Status.EXPECTED,
        db_index=True,
        verbose_name='Состояние доставки',
    )
    expected_date = models.DateField(null=True, blank=True, db_index=True, verbose_name='Ожидаемая дата приезда')
    received_date = models.DateField(null=True, blank=True, db_index=True, verbose_name='Дата приёмки')
    dispatch_date = models.DateField(null=True, blank=True, db_index=True, verbose_name='Дата сборки/отправки')
    dispatch_time = models.TimeField(null=True, blank=True, verbose_name='Время отправки')
    courier_name = models.CharField(max_length=255, blank=True, verbose_name='Курьер / служба')
    tracking_number = models.CharField(max_length=255, blank=True, verbose_name='Трек-номер / накладная')
    sender = models.CharField(max_length=255, blank=True, verbose_name='Откуда / отправитель')
    recipient = models.CharField(max_length=255, blank=True, verbose_name='Куда / получатель')
    storage_place = models.CharField(max_length=255, blank=True, verbose_name='Место хранения')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['expected_date', 'dispatch_date', '-created_at']
        verbose_name = 'Курьерская доставка'
        verbose_name_plural = 'Курьерские доставки'

    def __str__(self):
        return self.title


class CourierBox(models.Model):
    delivery = models.ForeignKey(CourierDelivery, related_name='boxes', on_delete=models.CASCADE)
    box_code = models.CharField(max_length=120, blank=True, verbose_name='Номер/маркировка коробки')
    note = models.TextField(blank=True, verbose_name='Примечание по коробке')
    requests = models.ManyToManyField(
        WorkRequest,
        related_name='courier_boxes',
        verbose_name='Счета/заявки в коробке',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']
        verbose_name = 'Коробка доставки'
        verbose_name_plural = 'Коробки доставки'

    def __str__(self):
        return self.box_code or f'Коробка #{self.pk}'


class CourierBoxAttachment(models.Model):
    box = models.ForeignKey(CourierBox, related_name='attachments', on_delete=models.CASCADE)
    file = models.FileField(upload_to='courier_box_attachments/%Y/%m/%d/')
    original_name = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = 'Вложение коробки'
        verbose_name_plural = 'Вложения коробок'

    def __str__(self):
        return self.original_name or self.file.name


class TaskComment(models.Model):
    task = models.ForeignKey(Task, related_name='comments', on_delete=models.CASCADE)
    text = models.TextField(verbose_name='Комментарий')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Комментарий задачи'
        verbose_name_plural = 'Комментарии задач'

    def __str__(self):
        return f'Комментарий к задаче {self.task_id}'


class CourierComment(models.Model):
    delivery = models.ForeignKey(CourierDelivery, related_name='comments', on_delete=models.CASCADE)
    text = models.TextField(verbose_name='Комментарий')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Комментарий доставки'
        verbose_name_plural = 'Комментарии доставок'

    def __str__(self):
        return f'Комментарий к доставке {self.delivery_id}'


class TaskAttachment(models.Model):
    task = models.ForeignKey(Task, related_name='attachments', on_delete=models.CASCADE)
    file = models.FileField(upload_to='task_attachments/%Y/%m/%d/')
    original_name = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = 'Вложение задачи'
        verbose_name_plural = 'Вложения задач'

    def __str__(self):
        return self.original_name or self.file.name


class CourierAttachment(models.Model):
    delivery = models.ForeignKey(CourierDelivery, related_name='attachments', on_delete=models.CASCADE)
    file = models.FileField(upload_to='courier_attachments/%Y/%m/%d/')
    original_name = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = 'Вложение доставки'
        verbose_name_plural = 'Вложения доставок'

    def __str__(self):
        return self.original_name or self.file.name


class DayNote(models.Model):
    date = models.DateField(unique=True, db_index=True, verbose_name='Дата')
    text = models.TextField(blank=True, verbose_name='Заметка дня')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date']
        verbose_name = 'Заметка дня'
        verbose_name_plural = 'Заметки дней'

    def __str__(self):
        return f'Заметка {self.date}'


class OneCImportBatch(models.Model):
    class Status(models.TextChoices):
        PROCESSING = 'processing', 'Обрабатывается'
        DONE = 'done', 'Загружено'
        FAILED = 'failed', 'Ошибка'

    original_name = models.CharField(max_length=255, blank=True, verbose_name='Имя файла')
    file = models.FileField(upload_to='onec_imports/%Y/%m/%d/', verbose_name='Файл выгрузки 1С')
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.PROCESSING, db_index=True)
    rows_total = models.PositiveIntegerField(default=0, verbose_name='Всего строк')
    rows_created = models.PositiveIntegerField(default=0, verbose_name='Добавлено')
    rows_skipped_duplicates = models.PositiveIntegerField(default=0, verbose_name='Дубликатов пропущено')
    rows_invalid = models.PositiveIntegerField(default=0, verbose_name='Ошибочных строк')
    invalid_rows_preview = models.JSONField(default=list, blank=True, verbose_name='Первые ошибки')
    error_message = models.TextField(blank=True, verbose_name='Ошибка импорта')
    uploaded_at = models.DateTimeField(auto_now_add=True, db_index=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = 'Импорт 1С'
        verbose_name_plural = 'Импорты 1С'

    def __str__(self):
        return self.original_name or f'Импорт 1С #{self.pk}'


class OneCEvent(models.Model):
    class StatusCode(models.TextChoices):
        ACCEPTED_WAREHOUSE = 'accepted_warehouse', 'Принято на склад БП/СП'
        TRANSFERRED_TO_LAB = 'transferred_to_lab', 'Передано в лабораторию'
        TRANSFERRED_FROM_LAB = 'transferred_from_lab', 'Передано из лаборатории'
        ACCEPTED_LAB = 'accepted_lab', 'Принято в лаборатории'
        DONE_READY = 'done_ready', 'Выполнено / готово к выдаче'
        ISSUED_CUSTOMER = 'issued_customer', 'Выдан заказчику'
        OTHER = 'other', 'Другой статус'

    import_batch = models.ForeignKey(OneCImportBatch, related_name='events', on_delete=models.CASCADE)
    event_datetime = models.DateTimeField(db_index=True, verbose_name='Дата события')
    invoice_raw = models.CharField(max_length=512, verbose_name='Счёт исходный')
    invoice_number = models.CharField(max_length=32, db_index=True, verbose_name='Номер счёта')
    invoice_prefix = models.CharField(max_length=8, db_index=True, verbose_name='Префикс счёта')
    is_own_lab = models.BooleanField(default=False, db_index=True, verbose_name='Выполняется в нашей лаборатории')
    counterparty = models.CharField(max_length=512, blank=True, db_index=True, verbose_name='Контрагент')
    consignee = models.CharField(max_length=512, blank=True, verbose_name='Грузополучатель')
    service_name = models.TextField(blank=True, verbose_name='Услуга')
    work_description = models.TextField(blank=True, verbose_name='Описание работ / прибор')
    quantity = models.DecimalField(max_digits=12, decimal_places=3, default=1, verbose_name='Количество')
    status_raw = models.CharField(max_length=512, db_index=True, verbose_name='Статус исходный')
    status_code = models.CharField(max_length=32, choices=StatusCode.choices, default=StatusCode.OTHER, db_index=True)
    barcode = models.CharField(max_length=128, blank=True, db_index=True, verbose_name='Штрихкод')
    responsible_full_name = models.CharField(max_length=255, blank=True, db_index=True, verbose_name='ФИО ответственного')
    instrument_key = models.CharField(max_length=512, db_index=True, verbose_name='Ключ прибора')
    dedupe_hash = models.CharField(max_length=64, unique=True, db_index=True, verbose_name='Хэш антидубля')
    source_row_number = models.PositiveIntegerField(default=0, verbose_name='Строка исходного файла')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-event_datetime', '-id']
        indexes = [
            models.Index(fields=['invoice_number', '-event_datetime']),
            models.Index(fields=['instrument_key', '-event_datetime']),
            models.Index(fields=['status_code', '-event_datetime']),
            models.Index(fields=['is_own_lab', '-event_datetime']),
        ]
        verbose_name = 'Событие 1С'
        verbose_name_plural = 'События 1С'

    def __str__(self):
        return f'{self.invoice_number} / {self.status_raw} / {self.event_datetime:%d.%m.%Y %H:%M}'
