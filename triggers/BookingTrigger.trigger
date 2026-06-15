trigger BookingTrigger on Booking__c (after insert, after update) {
    /*
     * BookingTrigger
     * - Enqueues ZoomMeetingService for newly created or updated bookings when a meeting hasn't been created yet.
     * - Uses a trigger handler pattern to remain bulk-safe and avoid recursion.
     *
     * Note: The Queueable handles callouts. We enqueue once per booking batch.
     */

    if (Trigger.isAfter && (Trigger.isInsert || Trigger.isUpdate)) {
        // Collect booking ids that need meeting creation
        Set<Id> toProcess = new Set<Id>();
        for (Booking__c b : Trigger.new) {
            Booking__c oldB = Trigger.isInsert ? null : Trigger.oldMap.get(b.Id);
            // Only process if Meeting_Link__c or Zoom_Meeting_ID__c is empty
            Boolean alreadyHasMeeting = (b.Meeting_Link__c != null && b.Zoom_Meeting_ID__c != null);
            if (alreadyHasMeeting) continue;

            // If update, avoid reprocessing when no relevant change
            if (Trigger.isUpdate) {
                Booking__c oldRec = oldB;
                // If host email or attendees changed or status was blank, allow processing
                if (oldRec != null) {
                    Boolean hostChanged = oldRec.Host_Email__c != b.Host_Email__c;
                    Boolean attendeesChanged = oldRec.Attendees__c != b.Attendees__c;
                    Boolean statusEmpty = String.isBlank(oldRec.Status__c);
                    if (!(hostChanged || attendeesChanged || statusEmpty)) {
                        continue;
                    }
                }
            }
            toProcess.add(b.Id);
        }

        if (!toProcess.isEmpty()) {
            // Enqueue the Queueable in a single job; Queueable is bulk-safe
            System.enqueueJob(new ZoomMeetingService(new List<Id>(toProcess)));
        }
    }
}