/**
 * @description Test class for BookingController
 * @author Salesforce
 * @date 2026
 */
@isTest
private class BookingControllerTest {
    
    @testSetup
    static void setup() {
        // Create test meeting rooms
        List<Meeting_Room__c> rooms = new List<Meeting_Room__c>();
        for (Integer i = 1; i <= 3; i++) {
            rooms.add(new Meeting_Room__c(
                Name = 'Room ' + i,
                Capacity__c = 10 * i,
                Location__c = 'Floor ' + i,
                Is_Available__c = true
            ));
        }
        insert rooms;
        
        // Create test bookings with Time fields
        List<Booking__c> bookings = new List<Booking__c>();
        bookings.add(new Booking__c(
            Room__c = rooms[0].Id,
            Date__c = Date.today(),
            Start_Time__c = Time.newInstance(9, 0, 0, 0),
            End_Time__c = Time.newInstance(10, 0, 0, 0),
            Status__c = 'Scheduled',
            Booked_By__c = UserInfo.getUserId()
        ));
        
        bookings.add(new Booking__c(
            Room__c = rooms[1].Id,
            Date__c = Date.today(),
            Start_Time__c = Time.newInstance(14, 0, 0, 0),
            End_Time__c = Time.newInstance(15, 0, 0, 0),
            Status__c = 'Completed',
            Booked_By__c = UserInfo.getUserId()
        ));
        
        insert bookings;
    }
    
    @isTest
    static void testCreateBookingSuccess() {
        Meeting_Room__c room = [SELECT Id FROM Meeting_Room__c LIMIT 1];
        Date bookingDate = Date.today().addDays(1);
        String startTime = '10:00:00.000';
        String endTime = '11:00:00.000';
        String status = 'Confirmed';
        
        Test.startTest();
        String result = BookingController.createBooking(room.Id, bookingDate, startTime, endTime,status);
        Test.stopTest();
        
        System.assertEquals('Booking created successfully!', result, 'Expected success message');
        
        List<Booking__c> bookings = [SELECT Id, Status__c FROM Booking__c WHERE Date__c = :bookingDate];
        System.assertEquals(1, bookings.size(), 'Expected one booking to be created');
        System.assertEquals('Scheduled', bookings[0].Status__c, 'Expected status to be Scheduled');
    }
    
    @isTest
    static void testCreateBookingWithNullParameters() {
        Meeting_Room__c room = [SELECT Id FROM Meeting_Room__c LIMIT 1];
        
        Test.startTest();
        try {
            BookingController.createBooking(null, Date.today(), '10:00:00', '11:00:00','Confirmed');
            System.assert(false, 'Expected an exception to be thrown');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('All fields are required'), 'Expected validation error message');
        }
        Test.stopTest();
    }
    
    @isTest
    static void testCreateBookingWithInvalidTime() {
        Meeting_Room__c room = [SELECT Id FROM Meeting_Room__c LIMIT 1];
        Date bookingDate = Date.today().addDays(1);
        String startTime = '11:00:00';
        String endTime = '10:00:00';
        String status = 'Confirmed';
        
        Test.startTest();
        try {
            BookingController.createBooking(room.Id, bookingDate, startTime, endTime,status);
            System.assert(false, 'Expected an exception to be thrown');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('Start time must be before end time'), 'Expected validation error message');
        }
        Test.stopTest();
    }
    
    @isTest
    static void testCreateBookingWithOverlap() {
        Meeting_Room__c room = [SELECT Id FROM Meeting_Room__c WHERE Name = 'Room 1' LIMIT 1];
        Date bookingDate = Date.today();
        String startTime = '09:30:00';
        String endTime = '10:30:00';
        String status = 'Confirmed';
        
        Test.startTest();
        try {
            BookingController.createBooking(room.Id, bookingDate, startTime, endTime,status);
            System.assert(false, 'Expected an exception to be thrown');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('already booked') || e.getMessage().contains('selected time slot'), 'Expected overlap error message');
        }
        Test.stopTest();
    }
    
    @isTest
    static void testCreateBookingWithValidTimeFormat() {
        Meeting_Room__c room = [SELECT Id FROM Meeting_Room__c LIMIT 1];
        
        Test.startTest();
        // Test with HH:mm format
        String result1 = BookingController.createBooking(
            room.Id, 
            Date.today().addDays(1), 
            '09:00',
            '10:00',
            'Confirmed'
        );
        
        // Test with HH:mm:ss format
        String result2 = BookingController.createBooking(
            room.Id, 
            Date.today().addDays(2), 
            '14:30:00',
            '15:30:00',
            'Confirmed'
        );
        Test.stopTest();
        
        System.assertEquals('Booking created successfully!', result1, 'Booking should be created with HH:mm format');
        System.assertEquals('Booking created successfully!', result2, 'Booking should be created with HH:mm:ss format');
    }

    @isTest
    static void testCreateBookingWithInvalidTimeFormat() {
        Meeting_Room__c room = [SELECT Id FROM Meeting_Room__c LIMIT 1];
        
        Test.startTest();
        try {
            BookingController.createBooking(
                room.Id, 
                Date.today().addDays(1), 
                'invalid-time',
                '10:00:00',
                'Confirmed'
            );
            System.assert(false, 'Should throw exception for invalid time format');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('Invalid time format'), 
                'Error message should mention invalid time format');
        }
        Test.stopTest();
    }

    @isTest
    static void testCreateBookingWithNullTime() {
        Meeting_Room__c room = [SELECT Id FROM Meeting_Room__c LIMIT 1];
        
        Test.startTest();
        try {
            BookingController.createBooking(
                room.Id, 
                Date.today().addDays(1), 
                null,
                '10:00:00',
                'Confirmed'
            );
            System.assert(false, 'Should throw exception for null time');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('All fields are required'), 
                'Error message should mention required fields');
        }
        Test.stopTest();
    }

    @isTest
    static void testGetAvailableRooms() {
        Test.startTest();
        List<Meeting_Room__c> rooms = BookingController.getAvailableRooms();
        Test.stopTest();
        
        System.assertEquals(3, rooms.size(), 'Expected 3 available rooms');
        for (Meeting_Room__c room : rooms) {
            System.assertEquals(true, room.Is_Available__c, 'Expected all rooms to be available');
        }
    }
    
    @isTest
    static void testGetBookingsByStatusAll() {
        Test.startTest();
        List<Booking__c> bookings = BookingController.getBookingsByStatus('All');
        Test.stopTest();
        
        System.assertEquals(2, bookings.size(), 'Expected 2 bookings for All status');
    }
    
    @isTest
    static void testGetBookingsByStatusScheduled() {
        Test.startTest();
        List<Booking__c> bookings = BookingController.getBookingsByStatus('Scheduled');
        Test.stopTest();
        
        System.assertEquals(1, bookings.size(), 'Expected 1 scheduled booking');
        System.assertEquals('Scheduled', bookings[0].Status__c, 'Expected status to be Scheduled');
    }
    
    @isTest
    static void testGetBookingsByStatusCompleted() {
        Test.startTest();
        List<Booking__c> bookings = BookingController.getBookingsByStatus('Completed');
        Test.stopTest();
        
        System.assertEquals(1, bookings.size(), 'Expected 1 completed booking');
        System.assertEquals('Completed', bookings[0].Status__c, 'Expected status to be Completed');
    }
    
    @isTest
    static void testGetBookingsByStatusEmpty() {
        Test.startTest();
        List<Booking__c> bookings = BookingController.getBookingsByStatus('Cancelled');
        Test.stopTest();
        
        System.assertEquals(0, bookings.size(), 'Expected 0 cancelled bookings');
    }
}