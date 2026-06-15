public with sharing class ZoomMeetingService
implements Queueable, Database.AllowsCallouts {
    
    private List<Id> bookingIds;
    
    private static final String NAMED_CREDENTIAL = 'Zoom_NC';
    
    public ZoomMeetingService(List<Id> bookingIds) {
        this.bookingIds = bookingIds;
    }
    
    public void execute(QueueableContext context) {
        
        List<Booking__c> bookings = [

            SELECT Id,
                   Name,
                   Host_Email__c,
                   Attendees__c,
                   Meeting_Link__c,
                   Zoom_Meeting_ID__c,
                   Zoom_Response__c,
                   Status__c,
                   Date__c,
                   Start_Time__c,
                   End_Time__c

            FROM Booking__c

            WHERE Id IN :bookingIds

            FOR UPDATE
        ];
        
        List<Booking__c> updates =
            new List<Booking__c>();
        
        
        
        
        for (Booking__c b : bookings) {
            System.debug('==============================');
            System.debug('ZOOM PROCESSING BOOKING');
            System.debug('Booking Id: ' + b.Id);
            System.debug('Booking Name: ' + b.Name);
            System.debug('Host Email: ' + b.Host_Email__c);
            System.debug('Meeting Link: ' + b.Meeting_Link__c);
            System.debug('Zoom Meeting Id: ' + b.Zoom_Meeting_ID__c);
            System.debug('Date: ' + b.Date__c);
            System.debug('Start Time: ' + b.Start_Time__c);
            System.debug('End Time: ' + b.End_Time__c);
            System.debug('==============================');
            try {
                
                /*
                 * Skip if meeting already exists
                 */
                
                if (
                    b.Meeting_Link__c != null &&
                    b.Zoom_Meeting_ID__c != null
                ) {
                    continue;
                }
                
                /*
                 * Validate required fields
                 */
                
                if (
                    String.isBlank(b.Host_Email__c) ||
                    b.Date__c == null ||
                    b.Start_Time__c == null ||
                    b.End_Time__c == null
                ) {
                    
                    b.Status__c = 'Cancelled';
                    
                    b.Zoom_Response__c =
                        'Missing required fields';
                    
                    updates.add(b);
                    
                    continue;
                }
                
                /*
                 * Create Start DateTime
                 */
                
                Datetime startDateTime =
                    Datetime.newInstance(
                    b.Date__c,
                b.Start_Time__c
                    );
                
                /*
                 * Create End DateTime
                 */
                
                Datetime endDateTime =
                    Datetime.newInstance(
                    b.Date__c,
                b.End_Time__c
                    );
                
                
                /*
                 * Calculate duration
                 */
                
                Long durationMinutes =
                    (
                    endDateTime.getTime()
                    - startDateTime.getTime()
                    ) / (1000 * 60);
                
                if (durationMinutes <= 0) {
                    durationMinutes = 30;
                }
                
                System.debug('Start DateTime: ' + startDateTime);
                System.debug('End DateTime: ' + endDateTime);
                System.debug('Duration Minutes: ' + durationMinutes);
                
                /*
                 * Build Zoom Payload
                 */
                
                Map<String,Object> payload =
                new Map<String,Object>{
                    
                    'topic' =>
                        'Booking - ' + b.Name,
                    
                    'type' => 2,
                    
                    'start_time' =>
                        startDateTime.formatGMT(
                        'yyyy-MM-dd\'T\'HH:mm:ss\'Z\''
                        ),
                    
                    'duration' =>
                        durationMinutes,
                    
                    'timezone' => 'UTC',
                    
                    'settings' =>
                    new Map<String,Object>{
                        
                        'join_before_host' => true,
                        
                        'waiting_room' => false
                    }
                };
                
                System.debug('Zoom Payload:');
                System.debug(JSON.serializePretty(payload));
                
                /*
                 * Prepare Request
                 */
                
                HttpRequest req =
                    new HttpRequest();
                
                // String endpoint =
                //     'callout:' +
                //     NAMED_CREDENTIAL +
                //     '/users/' +
                //     EncodingUtil.urlEncode(
                //     b.Host_Email__c,
                // 'UTF-8'
                //     ) +
                //     '/meetings';
                String endpoint =
                    'callout:' +
                    NAMED_CREDENTIAL +
                    '/users/' +
                    EncodingUtil.urlEncode(
                    b.Host_Email__c,
                'UTF-8'
                    ) +
                    '/meetings';
                
                System.debug('Named Credential: ' + NAMED_CREDENTIAL);
                System.debug('Endpoint: ' + endpoint);
                
                req.setEndpoint(endpoint);
                
                req.setMethod('POST');
                
                req.setHeader(
                    'Content-Type',
                'application/json'
                    );
                
                req.setBody(
                    JSON.serialize(payload)
                    );
                
                req.setTimeout(120000);
                
                /*
                 * Send Request
                 */
                System.debug('Sending Zoom Request...');
                System.debug('Request Body: ' + req.getBody());
                
                Http http = new Http();
                
                HttpResponse res =
                    http.send(req);
                
                System.debug('==============================');
                System.debug('ZOOM RESPONSE');
                System.debug('Status Code: ' + res.getStatusCode());
                System.debug('Status: ' + res.getStatus());
                System.debug('Body: ' + res.getBody());
                System.debug('==============================');
                
                /*
                 * Success Response
                 */
                
                if (
                    res.getStatusCode() >= 200 &&
                    res.getStatusCode() < 300
                ) {
                    
                    Map<String,Object> parsed =
                        (Map<String,Object>)
                        JSON.deserializeUntyped(
                        res.getBody()
                        );
                    
                    b.Meeting_Link__c =
                        (String) parsed.get(
                        'join_url'
                        );
                    
                    b.Zoom_Meeting_ID__c =
                        String.valueOf(
                        parsed.get('id')
                        );
                    
                    b.Zoom_Response__c =
                        res.getBody();
                    
                    b.Status__c =
                        'Scheduled';
                    
                    /*
                     * Send Invitations
                     */
                    
                    sendInvitations(
                        b,
                    b.Meeting_Link__c
                        );
                    
                } else {
                    
                    b.Status__c = 'Scheduled';
                    
                    b.Zoom_Response__c =
                        'HTTP Error: '
                        + res.getStatusCode()
                        + ' '
                        + res.getBody();
                }
                
            } catch (Exception e) {
                
                b.Status__c = 'Scheduled';
                
                b.Zoom_Response__c =
                    'Exception: '
                    + e.getMessage();
            }
            
            updates.add(b);
        }
        
        /*
         * Update Records
         */
        
        if (!updates.isEmpty()) {
            
            update updates;
        }
    }
    
    /*
     * Send Email Invitations
     */
    
    private static void sendInvitations(
        Booking__c booking,
    String joinUrl
    ) {
        
        if (
            String.isBlank(
            booking.Attendees__c
            )
        ) {
            return;
        }
        
        List<String> emails =
            booking.Attendees__c.split(
            '[,;\\n\\r]+'
            );
        
        List<Messaging.SingleEmailMessage>
            emailMessages =
            new List<
            Messaging.SingleEmailMessage
            >();
        
        for (String email : emails) {
            
            email = email.trim();
            
            if (!isValidEmail(email)) {
                continue;
            }
            
            Messaging.SingleEmailMessage mail =
                new Messaging.SingleEmailMessage();
            
            mail.setToAddresses(
            new List<String>{ email }
            );
            
            mail.setSubject(
                'Zoom Meeting Invitation - '
                + booking.Name
                );
            
            String body =
                'You are invited to a Zoom meeting.\n\n'
                + 'Booking: '
                + booking.Name
                + '\n\n'
                + 'Meeting Link:\n'
                + joinUrl;
            
            mail.setPlainTextBody(body);
            
            emailMessages.add(mail);
        }
        
        if (!emailMessages.isEmpty()) {
            
            Messaging.sendEmail(
                emailMessages
                );
        }
    }
    
    /*
     * Email Validation
     */
    
    public static Boolean isValidEmail(
        String email
    ) {
        
        if (String.isBlank(email)) {
            return false;
        }
        
        Pattern pattern = Pattern.compile(
            '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'
            );
        
        Matcher matcher =
            pattern.matcher(email);
        
        return matcher.matches();
    }
}