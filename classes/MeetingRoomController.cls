public with sharing class MeetingRoomController {
    
    /**
     * Get all meeting rooms
     */
    @AuraEnabled(cacheable=true)
    public static List<Meeting_Room__c> getAllRooms() {
        try {
            return [
                SELECT Id, Name, Capacity__c, Location__c, Is_Available__c
                FROM Meeting_Room__c
                ORDER BY Name ASC
            ];
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching meeting rooms: ' + e.getMessage());
        }
    }
    
    /**
     * Get available meeting rooms
     */
    @AuraEnabled(cacheable=true)
    public static List<Meeting_Room__c> getAvailableRooms() {
        try {
            return [
                SELECT Id, Name, Capacity__c, Location__c, Is_Available__c
                FROM Meeting_Room__c
                WHERE Is_Available__c = true
                ORDER BY Name ASC
            ];
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching available rooms: ' + e.getMessage());
        }
    }
    
    /**
     * Get single meeting room by Id
     */
    @AuraEnabled
    public static Meeting_Room__c getRoom(Id roomId) {
        try {
            return [
                SELECT Id, Name, Capacity__c, Location__c, Is_Available__c
                FROM Meeting_Room__c
                WHERE Id = :roomId
                LIMIT 1
            ];
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching room: ' + e.getMessage());
        }
    }
    
    /**
     * Create or update meeting room
     */
    @AuraEnabled
    public static Meeting_Room__c saveRoom(Meeting_Room__c room) {
        try {
            // Validate required fields
            if (String.isBlank(room.Name)) {
                throw new ValidationException('Room name is required');
            }
            if (room.Capacity__c == null || room.Capacity__c <= 0) {
                throw new ValidationException('Capacity must be greater than 0');
            }
            if (String.isBlank(room.Location__c)) {
                throw new ValidationException('Location is required');
            }
            
            upsert room;
            return getRoom(room.Id);
        } catch (ValidationException e) {
            throw new AuraHandledException(e.getMessage());
        } catch (Exception e) {
            throw new AuraHandledException('Error saving room: ' + e.getMessage());
        }
    }
    
    /**
     * Delete meeting room
     */
    @AuraEnabled
    public static void deleteRoom(Id roomId) {
        try {
            // Check if room has active bookings
            List<Booking__c> activeBookings = [
                SELECT Id 
                FROM Booking__c 
                WHERE Room__c = :roomId 
                AND Status__c != 'Cancelled'
                AND Date__c >= TODAY
                LIMIT 1
            ];
            
            if (!activeBookings.isEmpty()) {
                throw new ValidationException('Cannot delete room with active bookings');
            }
            
            Meeting_Room__c room = new Meeting_Room__c(Id = roomId);
            delete room;
        } catch (ValidationException e) {
            throw new AuraHandledException(e.getMessage());
        } catch (Exception e) {
            throw new AuraHandledException('Error deleting room: ' + e.getMessage());
        }
    }
    
    /**
     * Search rooms by name or location
     */
    @AuraEnabled(cacheable=true)
    public static List<Meeting_Room__c> searchRooms(String searchTerm) {
        try {
            String searchPattern = '%' + searchTerm + '%';
            return [
                SELECT Id, Name, Capacity__c, Location__c, Is_Available__c
                FROM Meeting_Room__c
                WHERE Name LIKE :searchPattern 
                OR Location__c LIKE :searchPattern
                ORDER BY Name ASC
            ];
        } catch (Exception e) {
            throw new AuraHandledException('Error searching rooms: ' + e.getMessage());
        }
    }
}