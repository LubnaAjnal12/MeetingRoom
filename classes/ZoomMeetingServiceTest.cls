@isTest
private class ZoomMeetingServiceTest {
    
    /*
     * Mock Success Response
     */
    private class MockSuccess
    implements HttpCalloutMock {
        
        public HTTPResponse respond(
            HTTPRequest req
        ) {
            
            HttpResponse res =
                new HttpResponse();
            
            res.setHeader(
                'Content-Type',
            'application/json'
                );
            
            res.setStatusCode(201);
            
            res.setBody(
                '{' +
                '"id":"123456789",' +
                '"join_url":"https://zoom.us/j/123456789"' +
                '}'
                );
            
            return res;
        }
    }
    
    /*
     * Mock Failure Response
     */
    private class MockFailure
    implements HttpCalloutMock {
        
        public HTTPResponse respond(
            HTTPRequest req
        ) {
            
            HttpResponse res =
                new HttpResponse();
            
            res.setHeader(
                'Content-Type',
            'application/json'
                );
            
            res.setStatusCode(400);
            
            res.setBody(
                '{"message":"Bad Request"}'
                );
            
            return res;
        }
    }
    
    /*
     * TEST SUCCESS
     */
    @isTest
    static void testCreateMeetingSuccess() {
        
        Booking__c booking =
            new Booking__c(
            
        Date__c =
            Date.today(),
        
        Host_Email__c =
            'host@example.com',
        
        Attendees__c =
            'user1@test.com,user2@test.com',
        
        Start_Time__c =
            Time.newInstance(
            10,
        0,
        0,
        0
            ),
        
        End_Time__c =
            Time.newInstance(
            11,
        0,
        0,
        0
            ),
        
        Status__c =
            'Pending'
            );
        
        insert booking;
        
        Test.setMock(
            HttpCalloutMock.class,
        new MockSuccess()
            );
        
        Test.startTest();
        
        System.enqueueJob(
            new ZoomMeetingService(
        new List<Id>{
            booking.Id
        }
        )
            );
        
        Test.stopTest();
        
        Booking__c updated =
            [
                SELECT
                    Meeting_Link__c,
                    Zoom_Meeting_ID__c,
                    Status__c,
                    Zoom_Response__c
                FROM Booking__c
                WHERE Id = :booking.Id
            ];
        
        System.assertEquals(
            'Meeting Created',
        updated.Status__c
            );
        
        System.assertEquals(
            'https://zoom.us/j/123456789',
        updated.Meeting_Link__c
            );
        
        System.assertEquals(
            '123456789',
        updated.Zoom_Meeting_ID__c
            );
        
        System.assert(
            updated.Zoom_Response__c
            .contains('join_url')
            );
    }
    
    /*
     * TEST FAILURE
     */
    @isTest
    static void testCreateMeetingFailure() {
        
        Booking__c booking =
            new Booking__c(
            
        Date__c =
            Date.today(),
        
        Host_Email__c =
            'wrong@test.com',
        
        Attendees__c =
            'user@test.com',
        
        Start_Time__c =
            Time.newInstance(
            12,
        0,
        0,
        0
            ),
        
        End_Time__c =
            Time.newInstance(
            13,
        0,
        0,
        0
            ),
        
        Status__c =
            'Pending'
            );
        
        insert booking;
        
        Test.setMock(
            HttpCalloutMock.class,
        new MockFailure()
            );
        
        Test.startTest();
        
        System.enqueueJob(
            new ZoomMeetingService(
        new List<Id>{
            booking.Id
        }
        )
            );
        
        Test.stopTest();
        
        Booking__c updated =
            [
                SELECT
                    Status__c,
                    Zoom_Response__c
                FROM Booking__c
                WHERE Id = :booking.Id
            ];
        
        System.assertEquals(
            'Failed',
        updated.Status__c
            );
        
        System.assert(
            updated.Zoom_Response__c
            .contains('HTTP Error')
            );
    }
    
    /*
     * TEST EMAIL VALIDATION
     */
    // @isTest
    // static void testEmailValidation() {
        
        //     System.assertEquals(
        //         true,
        //         ZoomMeetingService
        //             .isValidEmail(
        //                 'test@example.com'
        //             )
        //     );
        
        //     System.assertEquals(
        //         false,
        //         ZoomMeetingService
        //             .isValidEmail(
        //                 'invalid-email'
        //             )
        //     );
    // }
    @isTest
    static void testEmailValidation() {
        
        Boolean validEmail =
            ZoomMeetingService.isValidEmail(
            'test@example.com'
            );
        
        Boolean invalidEmail =
            ZoomMeetingService.isValidEmail(
            'invalid-email'
            );
        
        System.assert(validEmail);
        
        System.assertEquals(
            false,
        invalidEmail
            );
    }
}