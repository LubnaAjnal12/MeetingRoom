import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import getAvailableRooms from '@salesforce/apex/BookingController.getAvailableRooms';
import createBooking from '@salesforce/apex/BookingController.createBooking';
import getBookingsByStatus from '@salesforce/apex/BookingController.getBookingsByStatus';
import updateBooking from '@salesforce/apex/BookingController.updateBooking';
import deleteBooking from '@salesforce/apex/BookingController.deleteBooking';

export default class MeetingRoomBooking extends LightningElement {
    // Form fields
    @track selectedRoomId = '';
    @track bookingDate = '';
    @track startTime = '';
    @track endTime = '';
    @track statusFilter = 'All';
    
    // Data
    @track rooms = [];
    @track bookings = [];
    @track isLoading = false;
    
    // Edit modal
    @track showEditModal = false;
    @track editBooking = {};
    
    // Delete modal
    @track showDeleteModal = false;
    @track bookingToDelete = null;
    
    wiredBookingsResult;

    // Status filter options
    statusOptions = [
        { label: 'All Bookings', value: 'All' },
        { label: 'Scheduled', value: 'Scheduled' },
        { label: 'Completed', value: 'Completed' },
        { label: 'Cancelled', value: 'Cancelled' },
        { label: 'Expired', value: 'Expired' }
    ];

    // Edit status options
    editStatusOptions = [
        { label: 'Scheduled', value: 'Scheduled' },
        { label: 'Completed', value: 'Completed' },
        { label: 'Cancelled', value: 'Cancelled' },
        { label: 'Expired', value: 'Expired' }
    ];

    // Wire to get available rooms
    @wire(getAvailableRooms)
    wiredRooms({ error, data }) {
        if (data) {
            this.rooms = data.map(room => ({
                label: `${room.Name} (${room.Location__c || 'No Location'}) - Capacity: ${room.Capacity__c || 'N/A'}`,
                value: room.Id
            }));
        } else if (error) {
            this.handleError(error, 'Error loading rooms');
        }
    }

    // Wire to get bookings by status
    @wire(getBookingsByStatus, { statusFilter: '$statusFilter' })
    wiredBookings(result) {
        this.wiredBookingsResult = result;
        if (result.data) {
            this.bookings = result.data.map(booking => ({
                ...booking,
                RoomName: booking.Room__r ? booking.Room__r.Name : 'Unknown Room',
                BookedByName: booking.Booked_By__r ? booking.Booked_By__r.Name : 'Unknown User',
                FormattedDate: this.formatDate(booking.Date__c),
                FormattedStartTime: this.formatTimeAMPM(booking.Start_Time__c),
                FormattedEndTime: this.formatTimeAMPM(booking.End_Time__c),
                StatusClass: this.getStatusClass(booking.Status__c)
            }));
        } else if (result.error) {
            this.handleError(result.error, 'Error loading bookings');
            this.bookings = [];
        }
    }

    // Handle room selection
    handleRoomChange(event) {
        this.selectedRoomId = event.detail.value;
    }

    // Handle date change
    handleDateChange(event) {
        this.bookingDate = event.target.value;
    }

    // Handle start time change
    handleStartTimeChange(event) {
        this.startTime = event.target.value;
    }

    // Handle end time change
    handleEndTimeChange(event) {
        this.endTime = event.target.value;
    }

    // Handle status filter change
    handleStatusChange(event) {
        this.statusFilter = event.detail.value;
    }

    // Handle create booking
    handleCreateBooking() {
        // Validation
        if (!this.selectedRoomId || !this.bookingDate || !this.startTime || !this.endTime) {
            this.showToast('Error', 'Please fill in all fields', 'error');
            return;
        }

        this.isLoading = true;

        createBooking({
            roomId: this.selectedRoomId,
            bookingDate: this.bookingDate,
            startTime: this.startTime,
            endTime: this.endTime
        })
            .then(result => {
                this.showToast('Success', result, 'success');
                this.resetForm();
                return refreshApex(this.wiredBookingsResult);
            })
            .catch(error => {
                this.handleError(error, 'Error creating booking');
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    // Handle edit booking button click
    handleEditBooking(event) {
        const bookingId = event.currentTarget.dataset.id;
        const booking = this.bookings.find(b => b.Id === bookingId);
        
        if (booking) {
            this.editBooking = {
                Id: booking.Id,
                Room__c: booking.Room__c,
                Date__c: booking.Date__c,
                Start_Time__c: this.formatTime(booking.Start_Time__c),
                End_Time__c: this.formatTime(booking.End_Time__c),
                Status__c: booking.Status__c
            };
            this.showEditModal = true;
        }
    }

    // Edit modal field handlers
    handleEditRoomChange(event) {
        this.editBooking = { ...this.editBooking, Room__c: event.detail.value };
    }

    handleEditDateChange(event) {
        this.editBooking = { ...this.editBooking, Date__c: event.target.value };
    }

    handleEditStartTimeChange(event) {
        this.editBooking = { ...this.editBooking, Start_Time__c: event.target.value };
    }

    handleEditEndTimeChange(event) {
        this.editBooking = { ...this.editBooking, End_Time__c: event.target.value };
    }

    handleEditStatusChange(event) {
        this.editBooking = { ...this.editBooking, Status__c: event.detail.value };
    }

    // Save edited booking
    handleSaveBooking() {
        updateBooking({
            bookingId: this.editBooking.Id,
            roomId: this.editBooking.Room__c,
            bookingDate: this.editBooking.Date__c,
            startTime: this.editBooking.Start_Time__c,
            endTime: this.editBooking.End_Time__c,
            status: this.editBooking.Status__c
        })
            .then(result => {
                this.showToast('Success', result, 'success');
                this.closeEditModal();
                return refreshApex(this.wiredBookingsResult);
            })
            .catch(error => {
                this.handleError(error, 'Error updating booking');
            });
    }

    // Close edit modal
    closeEditModal() {
        this.showEditModal = false;
        this.editBooking = {};
    }

    // Handle delete booking button click
    handleDeleteBooking(event) {
        this.bookingToDelete = event.currentTarget.dataset.id;
        this.showDeleteModal = true;
    }

    // Confirm delete booking
    confirmDeleteBooking() {
        if (this.bookingToDelete) {
            deleteBooking({ bookingId: this.bookingToDelete })
                .then(result => {
                    this.showToast('Success', result, 'success');
                    this.closeDeleteModal();
                    return refreshApex(this.wiredBookingsResult);
                })
                .catch(error => {
                    this.handleError(error, 'Error deleting booking');
                });
        }
    }

    // Close delete modal
    closeDeleteModal() {
        this.showDeleteModal = false;
        this.bookingToDelete = null;
    }

    // Reset form
    resetForm() {
        this.selectedRoomId = '';
        this.bookingDate = '';
        this.startTime = '';
        this.endTime = '';
    }

    // Format date (e.g., "8 May 2026")
    formatDate(dateValue) {
        if (!dateValue) return '';
        const date = new Date(dateValue + 'T00:00:00');
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    // Format time to HH:mm for input fields
    formatTime(timeValue) {
        if (!timeValue) {
            return '';
        }
        const timeString = String(timeValue);
        return timeString.length >= 5 ? timeString.substring(0, 5) : timeString;
    }

    // Format time to AM/PM (e.g., "2:00 PM")
    formatTimeAMPM(timeValue) {
        if (!timeValue) return '';
        
        const timeString = String(timeValue);
        const parts = timeString.split(':');
        
        if (parts.length < 2) return timeString;
        
        let hour = parseInt(parts[0], 10);
        const minute = parts[1];
        const ampm = hour >= 12 ? 'PM' : 'AM';
        
        hour = hour % 12;
        hour = hour ? hour : 12; // 0 should be 12
        
        return `${hour}:${minute} ${ampm}`;
    }

    // Get status badge class
    getStatusClass(status) {
        switch(status) {
            case 'Scheduled':
                return 'slds-theme_success';
            case 'Completed':
                return 'slds-theme_info';
            case 'Cancelled':
                return 'slds-theme_error';
            case 'Expired':
                return 'slds-theme_warning';
            default:
                return '';
        }
    }

    // Handle errors
    handleError(error, title) {
        console.error(title + ':', JSON.stringify(error));

        let errorMessage = 'Unknown error occurred';

        if (error?.body?.message) {
            errorMessage = error.body.message;
        } else if (error?.message) {
            errorMessage = error.message;
        } else if (Array.isArray(error?.body)) {
            errorMessage = error.body.map(e => e.message).join(', ');
        }

        this.showToast('Error', errorMessage, 'error');
    }

    // Show toast notification
    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(event);
    }

    // Getter for checking if bookings exist
    get hasBookings() {
        return this.bookings && this.bookings.length > 0;
    }
}