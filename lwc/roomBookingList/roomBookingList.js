import { LightningElement, wire, track, api } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getBookingsByStatus from '@salesforce/apex/BookingController.getBookingsByStatus';
import markBookingCompleted from '@salesforce/apex/BookingController.markBookingCompleted';

export default class RoomBookingList extends LightningElement {
    @track bookings = [];
    @track filteredBookings = [];
    @track searchTerm = '';
    @track filterStatus = 'All';
    @track isLoading = false;

    wiredBookingsResult;

    statusFilterOptions = [
        { label: 'All Bookings', value: 'All' },
        { label: 'Scheduled', value: 'Scheduled' },
        { label: 'Completed', value: 'Completed' },
        { label: 'Cancelled', value: 'Cancelled' }

    ];

    @wire(getBookingsByStatus, { statusFilter: '$filterStatus' })
    wiredBookings(result) {
        this.wiredBookingsResult = result;
        if (result.data) {
            this.bookings = result.data;
            // console.log('this.bookings: ', this.bookings);
            this.applyClientSideFilters();
            // Evaluate and persist completed statuses where needed
            this.updateBookingStatuses();
        } else if (result.error) {
            console.error('Error loading bookings:', result.error);
        }
    }

    get hasBookings() {
        return this.filteredBookings && this.filteredBookings.length > 0;
    }

    get bookingCount() {
        return this.filteredBookings ? this.filteredBookings.length : 0;
    }

    handleSearch(event) {
        this.searchTerm = event.target.value;
        this.applyClientSideFilters();
    }

    handleStatusFilter(event) {
        this.filterStatus = event.detail.value;
        // Wire will automatically refresh with new statusFilter
    }

    applyClientSideFilters() {
        if (!this.bookings) {
            this.filteredBookings = [];
            return;
        }

        let filtered = [...this.bookings];

        // Apply search term filter
        if (this.searchTerm) {
            const searchLower = this.searchTerm.toLowerCase();
            filtered = filtered.filter(booking => {
                const roomName = booking.Room__r?.Name?.toLowerCase() || '';
                const bookedBy = booking.Booked_By__r?.Name?.toLowerCase() || '';
                const bookingName = booking.Name?.toLowerCase() || '';

                return roomName.includes(searchLower) ||
                    bookedBy.includes(searchLower) ||
                    bookingName.includes(searchLower);
            });
        }

        this.filteredBookings = filtered;
    }

    handleEdit(event) {
        const bookingId = event.currentTarget.dataset.id;
        // console.log('bookingId: ', bookingId);
        const booking = this.filteredBookings.find(b => b.Id === bookingId);
        // console.log('booking: ', JSON.stringify(booking));

        if (booking) {
            this.dispatchEvent(new CustomEvent('editbooking', {
                detail: booking
            }));
        }
    }

    handleDelete(event) {
        const bookingId = event.currentTarget.dataset.id;

        this.dispatchEvent(new CustomEvent('deletebooking', {
            detail: bookingId
        }));
    }

    handleCancelBooking(event) {
        const bookingId = event.currentTarget.dataset.id;

        this.dispatchEvent(new CustomEvent('cancelbooking', {
            detail: bookingId
        }));
    }

    handleJoinMeeting(event) {
        const meetingLink = event.currentTarget.dataset.link;
        console.log('meetingLink: ', meetingLink);

        if (meetingLink) {
            window.open(meetingLink, '_blank');
        }
    }

    // handleCopyLink(event) {
    //     const meetingLink = event.currentTarget.dataset.link;

    //     if (meetingLink) {
    //         navigator.clipboard.writeText(meetingLink)
    //             .then(() => {
    //                 // Show success toast
    //                 this.dispatchEvent(
    //                     new ShowToastEvent({
    //                         title: '',
    //                         message: 'Meeting link copied to clipboard',
    //                         variant: 'success'
    //                     })
    //                 );
    //             })
    //             .catch(() => {
    //                 // Show error toast
    //                 this.dispatchEvent(
    //                     new ShowToastEvent({
    //                         title: '',
    //                         message: 'Failed to copy meeting link',
    //                         variant: 'error'
    //                     })
    //                 );
    //             });
    //     }
    // }

    handleCopyLink(event) {
        event.preventDefault(); // Prevent navigation

        const meetingLink = event.currentTarget.dataset.link;

        if (meetingLink) {
            navigator.clipboard.writeText(meetingLink)
                .then(() => {
                    this.dispatchEvent(
                        new ShowToastEvent({
                            message: 'Meeting link copied to clipboard',
                            variant: 'success'
                        })
                    );
                })
                .catch(() => {
                    this.dispatchEvent(
                        new ShowToastEvent({
                            message: 'Failed to copy meeting link',
                            variant: 'error'
                        })
                    );
                });
        }
    }

    @api handleRefresh() {
        this.isLoading = true;
        refreshApex(this.wiredBookingsResult)
            .finally(() => {
                this.isLoading = false;
            });
    }

    getStatusClass(status) {
        const statusLower = status ? status.toLowerCase() : '';
        // console.log('statusLower: ', statusLower);

        switch (statusLower) {
            case 'scheduled':
                return 'status-badge scheduled';

            case 'completed':
                return 'status-badge completed';

            case 'cancelled':
                return 'status-badge cancelled';

            default:
                return 'status-badge';
        }
    }

    formatTime(milliseconds) {
        if (!milliseconds) return '';

        const totalSeconds = milliseconds / 1000;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        const formattedHours = hours % 12 || 12;
        const ampm = hours >= 12 ? 'PM' : 'AM';

        return `${formattedHours}:${minutes
            .toString()
            .padStart(2, '0')} ${ampm}`;
    }

    formatDate(dateString) {
        if (!dateString) return '';

        const date = new Date(dateString);

        const options = {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        };

        return date.toLocaleDateString('en-GB', options)
            .replace(/ /g, ' - ');
    }

    // Add computed properties for each booking to include status class
    // get enrichedBookings() {
    //     return this.filteredBookings.map(booking => ({
    //         ...booking,
    //         statusClass: this.getStatusClass(booking.status)
    //     }));
    // }

    // Async evaluator that updates Salesforce if necessary.
    async evaluateBookingStatus(booking) {

        if (!booking) {
            return 'Scheduled';
        }

        const currentStatus = booking.Status__c;

        // Do not modify cancelled bookings
        if (currentStatus === 'Cancelled') {
            return 'Cancelled';
        }

        // Validate required fields
        if (!booking.Date__c || booking.End_Time__c == null) {
            return currentStatus || 'Scheduled';
        }

        try {

            // Convert milliseconds into HH:mm:ss
            const totalSeconds = booking.End_Time__c / 1000;

            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = Math.floor(totalSeconds % 60);

            const hh = String(hours).padStart(2, '0');
            const mm = String(minutes).padStart(2, '0');
            const ss = String(seconds).padStart(2, '0');

            // Build local datetime
            const bookingEndDateTime = new Date(
                `${booking.Date__c}T${hh}:${mm}:${ss}`
            );

            const now = new Date();

            // If booking end time passed
            if (
                bookingEndDateTime < now &&
                currentStatus !== 'Completed'
            ) {

                // Update Salesforce database
                await markBookingCompleted({
                    bookingId: booking.Id
                });

                // DO NOT mutate wired object directly
                return 'Completed';
            }

            return currentStatus || 'Scheduled';

        } catch (error) {

            console.error(
                'Error auto updating booking status',
                error
            );

            return currentStatus || 'Scheduled';
        }
    }

    // Update statuses for all filtered bookings (runs sequentially to avoid rate limits)
    // Update statuses for all filtered bookings
    async updateBookingStatuses() {

        if (!this.filteredBookings?.length) {
            return;
        }

        let hasUpdates = false;

        for (const booking of this.filteredBookings) {

            const evaluatedStatus =
                await this.evaluateBookingStatus(booking);

            if (
                evaluatedStatus === 'Completed' &&
                booking.Status__c !== 'Completed'
            ) {
                hasUpdates = true;
            }
        }

        // Refresh wire after DB updates
        if (hasUpdates) {
            await refreshApex(this.wiredBookingsResult);
        }
    }

    get enrichedBookings() {

        return this.filteredBookings.map(booking => {
            // console.log('booking: ', JSON.stringify(booking));

            const evaluatedStatus =
                booking.Status__c || 'Scheduled';

            const hasMeetingLink =
                !!booking.Meeting_Link__c;

            // console.log('Meeting Link:', booking.Meeting_Link__c);
            // console.log('Has Meeting Link:', !!booking.Meeting_Link__c);
            // console.log('Status:', booking.Status__c);
            return {
                ...booking,

                statusDisplayed: evaluatedStatus,

                statusClass:
                    this.getStatusClass(evaluatedStatus),

                formattedDate:
                    this.formatDate(booking.Date__c),

                startTime:
                    this.formatTime(booking.Start_Time__c),

                endTime:
                    this.formatTime(booking.End_Time__c),

                bookedByName:
                    booking.Booked_By__r?.Name || 'N/A',

                roomName:
                    booking.Room__r?.Name || 'N/A',

                showJoinMeeting:
                    evaluatedStatus === 'Scheduled' &&
                    hasMeetingLink,

                showCopyLink:
                    ['Scheduled', 'Completed']
                        .includes(evaluatedStatus) &&
                    hasMeetingLink,

                showEdit:
                    evaluatedStatus === 'Scheduled',

                showCancel:
                    evaluatedStatus === 'Scheduled',

                showDelete: true
            };
        });
    }
}