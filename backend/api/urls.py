from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CourierAttachmentViewSet,
    CourierBoxAttachmentViewSet,
    CourierCommentViewSet,
    CourierDeliveryViewSet,
    DayNoteViewSet,
    OneCEventViewSet,
    OneCImportBatchViewSet,
    TaskAttachmentViewSet,
    TaskCommentViewSet,
    TaskViewSet,
    WorkRequestViewSet,
)

router = DefaultRouter()
router.register(r'requests', WorkRequestViewSet, basename='requests')
router.register(r'tasks', TaskViewSet, basename='tasks')
router.register(r'deliveries', CourierDeliveryViewSet, basename='deliveries')
router.register(r'task-comments', TaskCommentViewSet, basename='task-comments')
router.register(r'delivery-comments', CourierCommentViewSet, basename='delivery-comments')
router.register(r'task-attachments', TaskAttachmentViewSet, basename='task-attachments')
router.register(r'delivery-attachments', CourierAttachmentViewSet, basename='delivery-attachments')
router.register(r'box-attachments', CourierBoxAttachmentViewSet, basename='box-attachments')
router.register(r'day-notes', DayNoteViewSet, basename='day-notes')
router.register(r'onec-imports', OneCImportBatchViewSet, basename='onec-imports')
router.register(r'onec-events', OneCEventViewSet, basename='onec-events')

urlpatterns = [
    path('', include(router.urls)),
]
