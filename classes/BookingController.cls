/**
 * @description Controller class for Meeting Room Booking operations
 */
public with sharing class BookingController {
    
    /**
     * Create Booking
     */
    @AuraEnabled
    public static String createBooking(
        Id roomId,
    Date bookingDate,
    String startTime,
    String endTime,
    String status
    ) {
        
        if (roomId == null ||
            bookingDate == null ||
            String.isBlank(startTime) ||
        String.isBlank(endTime)) {
            
            throw new AuraHandledException('All fields are required.');
        }
        
        // Convert incoming time strings to Time objects
        Time startTimeValue = BookingTimeUtils.asTime(startTime);
        Time endTimeValue = BookingTimeUtils.asTime(endTime);
        
        if (startTimeValue == null || endTimeValue == null) {
            throw new AuraHandledException('Invalid time format.');
        }
        
        if (BookingTimeUtils.toMillis(startTimeValue) >= BookingTimeUtils.toMillis(endTimeValue)) {
            throw new AuraHandledException(
                'Start time must be before end time.'
                );
        }
        
        // Get existing bookings
        List<Booking__c> existingBookings = [
            SELECT Id,
                   Start_Time__c,
                   End_Time__c
            FROM Booking__c
            WHERE Room__c = :roomId
            AND Date__c = :bookingDate
            AND Status__c = :status
        ];
        
        // Check overlap
        for (Booking__c booking : existingBookings) {
            Time existingStart = BookingTimeUtils.asTime(booking.Start_Time__c);
            Time existingEnd = BookingTimeUtils.asTime(booking.End_Time__c);
            
            if (BookingTimeUtils.timesOverlap(startTimeValue, endTimeValue, existingStart, existingEnd)) {
                throw new AuraHandledException(
                    'This room is already booked for the selected time slot.'
                    );
            }
        }
        
        try {
            
            Booking__c newBooking = new Booking__c();
            
            newBooking.Room__c = roomId;
            newBooking.Date__c = bookingDate;
            newBooking.Start_Time__c = startTimeValue;
            newBooking.End_Time__c = endTimeValue;
            newBooking.Status__c = status;
            newBooking.Booked_By__c = UserInfo.getUserId();
            newBooking.Host_Email__c = UserInfo.getUserEmail();
            
            // Generate Microsoft Teams meeting link
            // String uniqueId = generateTeamsMeetingId();
            // newBooking.Meeting_Link__c = 'https://teams.microsoft.com/l/meetup-join/' + uniqueId;
            
            insert newBooking;
            System.enqueueJob(
                new ZoomMeetingService(
            new List<Id>{ newBooking.Id }
            )
                );
            
            return 'Booking created successfully!';
            
        } catch (Exception e) {
            
            throw new AuraHandledException(
                'Error creating booking: ' + e.getMessage()
                );
        }
    }
    
    /**
     * Generate Teams Meeting ID
     */
    // private static String generateTeamsMeetingId() {
        //     // Generate a random unique ID using Crypto
        //     Long randomLong = Crypto.getRandomLong();
        
        //     // Convert to string and remove hyphens
        //     String uniqueId = String.valueOf(Math.abs(randomLong));
        //     uniqueId = uniqueId.replace('-', '');
        
        //     return uniqueId;
    // }
    
    /**
     * Get Available Rooms
     */
    @AuraEnabled(cacheable=true)
    public static List<Meeting_Room__c> getAvailableRooms() {
        
        return [
            SELECT Id,
                   Name,
                   Capacity__c,
                   Location__c,
                   Is_Available__c
            FROM Meeting_Room__c
            WHERE Is_Available__c = true
            ORDER BY Name
        ];
    }
    
    /**
     * Get Bookings
     */
    @AuraEnabled(cacheable=true)
    public static List<Booking__c> getBookingsByStatus(
        String statusFilter
    ) {
        
        String query =
            'SELECT Id, Name, Room__c, Room__r.Name, ' +
            'Date__c, Start_Time__c, End_Time__c, ' +
            'Status__c, Booked_By__c, Booked_By__r.Name, ' +
            'Meeting_Link__c ' +
            'FROM Booking__c';
        
        if (
            String.isNotBlank(statusFilter) &&
            statusFilter != 'All'
        ) {
            
            query += ' WHERE Status__c = :statusFilter';
        }
        
        query +=
            ' ORDER BY Date__c DESC, Start_Time__c DESC LIMIT 100';
        
        return Database.query(query);
    }
    
    /**
     * Update Booking
     */
    @AuraEnabled
    public static String updateBooking(
        Id bookingId,
    Id roomId,
    Date bookingDate,
    String startTime,
    String endTime,
    String status
    ) {
        
        // Only bookingId is required always
        if (bookingId == null) {
            throw new AuraHandledException('Booking Id is required.');
        }
        
        // Special case for cancellation
        if (status == 'Cancelled') {
            
            try {
                
                Booking__c bookingToUpdate = new Booking__c(
                    Id = bookingId,
                Status__c = 'Cancelled'
                    );
                
                update bookingToUpdate;
                
                return 'Booking cancelled successfully!';
            }
            catch (Exception e) {
                
                throw new AuraHandledException(
                    'Error cancelling booking: ' + e.getMessage()
                    );
            }
        }
        
        // Validation for normal update
        if (
            roomId == null ||
            bookingDate == null ||
            String.isBlank(startTime) ||
            String.isBlank(endTime)
        ) {
            
            throw new AuraHandledException(
                'All fields are required.'
                );
        }
        
        // Convert incoming time strings to Time objects
        Time startTimeValue = BookingTimeUtils.asTime(startTime);
        Time endTimeValue = BookingTimeUtils.asTime(endTime);
        
        if (startTimeValue == null || endTimeValue == null) {
            throw new AuraHandledException('Invalid time format.');
        }
        
        if (
            BookingTimeUtils.toMillis(startTimeValue) >=
            BookingTimeUtils.toMillis(endTimeValue)
        ) {
            
            throw new AuraHandledException(
                'Start time must be before end time.'
                );
        }
        
        // Existing bookings
        List<Booking__c> existingBookings = [
            SELECT Id,
                   Start_Time__c,
                   End_Time__c
            FROM Booking__c
            WHERE Room__c = :roomId
            AND Date__c = :bookingDate
            AND Status__c = :status
            AND Id != :bookingId
        ];
        
        // Check overlap
        for (Booking__c booking : existingBookings) {
            
            Time existingStart =
                BookingTimeUtils.asTime(booking.Start_Time__c);
            
            Time existingEnd =
                BookingTimeUtils.asTime(booking.End_Time__c);
            
            if (
                BookingTimeUtils.timesOverlap(
                startTimeValue,
            endTimeValue,
            existingStart,
            existingEnd
                )
            ) {
                
                throw new AuraHandledException(
                    'This room is already booked for the selected time slot.'
                    );
            }
        }
        
        try {
            
            Booking__c bookingToUpdate = new Booking__c();
            
            bookingToUpdate.Id = bookingId;
            bookingToUpdate.Room__c = roomId;
            bookingToUpdate.Date__c = bookingDate;
            bookingToUpdate.Start_Time__c = startTimeValue;
            bookingToUpdate.End_Time__c = endTimeValue;
            bookingToUpdate.Status__c = status;
            
            update bookingToUpdate;
            
            return 'Booking updated successfully!';
        }
        catch (Exception e) {
            
            throw new AuraHandledException(
                'Error updating booking: ' + e.getMessage()
                );
        }
    }
    
    /**
     * Automatically mark booking as Completed
     */
    @AuraEnabled
    public static void markBookingCompleted(Id bookingId) {
        
        if (bookingId == null) {
            throw new AuraHandledException('Booking Id is required.');
        }
        
        try {
            
            Booking__c booking = [
                SELECT Id,
                       Status__c
                FROM Booking__c
                WHERE Id = :bookingId
                LIMIT 1
            ];
            
            // Prevent unnecessary updates
            if (
                booking.Status__c != 'Completed' &&
                booking.Status__c != 'Cancelled'
            ) {
                
                booking.Status__c = 'Completed';
                
                update booking;
            }
            
        } catch (Exception e) {
            
            throw new AuraHandledException(
                'Error updating booking status: ' + e.getMessage()
                );
        }
    }
    
    /**
     * Delete Booking
     */
    @AuraEnabled
    public static String deleteBooking(Id bookingId) {
        
        if (bookingId == null) {
            
            throw new AuraHandledException(
                'Booking ID is required.'
                );
        }
        
        try {
            
            delete new Booking__c(Id = bookingId);
            
            return 'Booking deleted successfully!';
            
        } catch (Exception e) {
            
            throw new AuraHandledException(
                'Error deleting booking: ' + e.getMessage()
                );
        }
    }
}