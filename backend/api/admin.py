from django.contrib import admin

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
)


@admin.register(WorkRequest)
class WorkRequestAdmin(admin.ModelAdmin):
    list_display = ('number', 'title', 'updated_at')
    search_fields = ('number', 'title')


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'planned_date', 'planned_time', 'updated_at')
    list_filter = ('status', 'planned_date')
    search_fields = ('title', 'description', 'requests__number')
    filter_horizontal = ('requests',)


class CourierBoxInline(admin.TabularInline):
    model = CourierBox
    extra = 0
    filter_horizontal = ('requests',)


@admin.register(CourierDelivery)
class CourierDeliveryAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'expected_date', 'received_date', 'dispatch_date', 'courier_name')
    list_filter = ('status', 'expected_date', 'received_date', 'dispatch_date')
    search_fields = ('title', 'description', 'tracking_number', 'boxes__requests__number')
    inlines = [CourierBoxInline]


@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    list_display = ('task', 'created_at')
    search_fields = ('text', 'task__title')


@admin.register(CourierComment)
class CourierCommentAdmin(admin.ModelAdmin):
    list_display = ('delivery', 'created_at')
    search_fields = ('text', 'delivery__title')


admin.site.register(TaskAttachment)
admin.site.register(CourierAttachment)
admin.site.register(CourierBoxAttachment)
admin.site.register(DayNote)



@admin.register(OneCImportBatch)
class OneCImportBatchAdmin(admin.ModelAdmin):
    list_display = ('original_name', 'status', 'rows_total', 'rows_created', 'rows_skipped_duplicates', 'rows_invalid', 'uploaded_at')
    list_filter = ('status', 'uploaded_at')
    search_fields = ('original_name', 'error_message')
    readonly_fields = ('uploaded_at', 'finished_at', 'invalid_rows_preview')


@admin.register(OneCEvent)
class OneCEventAdmin(admin.ModelAdmin):
    list_display = ('event_datetime', 'invoice_number', 'status_code', 'counterparty', 'quantity', 'barcode', 'is_own_lab')
    list_filter = ('status_code', 'is_own_lab', 'event_datetime')
    search_fields = ('invoice_number', 'invoice_raw', 'counterparty', 'consignee', 'work_description', 'barcode', 'responsible_full_name')
    readonly_fields = ('dedupe_hash', 'instrument_key', 'created_at')
