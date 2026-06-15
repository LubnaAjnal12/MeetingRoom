import { LightningElement, track, wire, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import LightningConfirm from 'lightning/confirm';
import getAvailableRooms from '@salesforce/apex/MeetingRoomController.getAvailableRooms';
import createBooking from '@salesforce/apex/BookingController.createBooking';
import updateBooking from '@salesforce/apex/BookingController.updateBooking';
import deleteBooking from '@salesforce/apex/BookingController.deleteBooking';
import Id from '@salesforce/user/Id';

export default class RoomBookingForm extends LightningElement {
    @track bookingId = null;
    @track roomId = null;
    @track bookingDate = null;
    @track startTime = '';
    @track endTime = '';
    @track status = 'Scheduled';
    @track isLoading = false;
    @track isEditMode = false;

    userId = Id;
    roomOptions = [];
    wiredRoomsResult;

    statusOptions = [
        { label: 'Scheduled', value: 'Scheduled' },
        // { label: 'Completed', value: 'Completed' },
        // { label: 'Cancelled', value: 'Cancelled' }
    ];

    // Time options from 6 AM to 10 PM (values in HH:mm:ss format for Time field)
    timeOptions = [
        { label: '6:00 AM', value: '06:00:00' },
        { label: '6:30 AM', value: '06:30:00' },
        { label: '7:00 AM', value: '07:00:00' },
        { label: '7:30 AM', value: '07:30:00' },
        { label: '8:00 AM', value: '08:00:00' },
        { label: '8:30 AM', value: '08:30:00' },
        { label: '9:00 AM', value: '09:00:00' },
        { label: '9:30 AM', value: '09:30:00' },
        { label: '10:00 AM', value: '10:00:00' },
        { label: '10:30 AM', value: '10:30:00' },
        { label: '11:00 AM', value: '11:00:00' },
        { label: '11:30 AM', value: '11:30:00' },
        { label: '12:00 PM', value: '12:00:00' },
        { label: '12:30 PM', value: '12:30:00' },
        { label: '1:00 PM', value: '13:00:00' },
        { label: '1:30 PM', value: '13:30:00' },
        { label: '2:00 PM', value: '14:00:00' },
        { label: '2:30 PM', value: '14:30:00' },
        { label: '3:00 PM', value: '15:00:00' },
        { label: '3:30 PM', value: '15:30:00' },
        { label: '4:00 PM', value: '16:00:00' },
        { label: '4:30 PM', value: '16:30:00' },
        { label: '5:00 PM', value: '17:00:00' },
        { label: '5:30 PM', value: '17:30:00' },
        { label: '6:00 PM', value: '18:00:00' },
        { label: '6:30 PM', value: '18:30:00' },
        { label: '7:00 PM', value: '19:00:00' },
        { label: '7:30 PM', value: '19:30:00' },
        { label: '8:00 PM', value: '20:00:00' },
        { label: '8:30 PM', value: '20:30:00' },
        { label: '9:00 PM', value: '21:00:00' },
        { label: '9:30 PM', value: '21:30:00' },
        { label: '10:00 PM', value: '22:00:00' }
    ];

    // Computed getters for filtered options (reactive)
    get filteredStartTimeOptions() {
        // If no date selected, show all options
        if (!this.bookingDate) {
            return this.timeOptions;
        }

        const selectedDate = new Date(this.bookingDate);
        const today = new Date();
        // Normalize dates to local day (ignore time)
        const isToday =
            selectedDate.getFullYear() === today.getFullYear() &&
            selectedDate.getMonth() === today.getMonth() &&
            selectedDate.getDate() === today.getDate();

        if (!isToday) {
            return this.timeOptions;
        }

        // For today's date, filter out past times based on current system time
        const now = new Date();
        const currentTimeStr = now.toTimeString().split(' ')[0]; // "HH:MM:SS"
        // Keep only timeOptions strictly greater than current time
        return this.timeOptions.filter(opt => opt.value > currentTimeStr);
    }

    get filteredEndTimeOptions() {
        // If no start time selected, show all (or filteredStartTimeOptions if bookingDate is today)
        const baseOptions = this.bookingDate && this.isSameDayAsToday(this.bookingDate)
            ? this.filteredStartTimeOptions
            : this.timeOptions;

        if (!this.startTime) {
            return baseOptions;
        }

        // Return options strictly greater than selected startTime
        return baseOptions.filter(opt => opt.value > this.startTime);
    }

    // Helper: check if a date string (YYYY-MM-DD) is today
    isSameDayAsToday(dateStr) {
        const d = new Date(dateStr);
        const t = new Date();
        return (
            d.getFullYear() === t.getFullYear() &&
            d.getMonth() === t.getMonth() &&
            d.getDate() === t.getDate()
        );
    }

    @wire(getAvailableRooms)
    wiredRooms(result) {
        this.wiredRoomsResult = result;
        if (result.data) {
            this.roomOptions = result.data.map(room => ({
                label: `${room.Name} (Capacity: ${room.Capacity__c})`,
                value: room.Id
            }));
        } else if (result.error) {
            console.error('Error loading rooms:', result.error);
        }
    }

    get formTitle() {
        return this.isEditMode ? 'Edit Booking' : 'Create New Booking';
    }

    get saveButtonLabel() {
        return this.isEditMode ? 'Update Booking' : 'Book Room';
    }

    get showCancelButton() {
        return this.isEditMode;
    }

    get minDate() {
        return new Date().toISOString().split('T')[0];
    }

    handleRoomChange(event) {
        this.roomId = event.detail.value;
    }

    handleDateChange(event) {
        this.bookingDate = event.target.value;
    }

    handleStartTimeChange(event) {
        this.startTime = event.detail.value;
    }

    handleEndTimeChange(event) {
        this.endTime = event.detail.value;
    }
 

    handleStatusChange(event) {
        this.status = event.detail.value;
    }

    handleSave() {
        console.log('Save button clicked');

        // (status auto-evaluation removed)

        if (!this.validateFields()) {
            console.log('Validation failed');
            return;
        }

        console.log('Validation passed');

        this.isLoading = true;
        console.log(' this.isLoading: ', this.isLoading);


        if (this.isEditMode) {
            // Update existing booking
            updateBooking({
                bookingId: this.bookingId,
                roomId: this.roomId,
                bookingDate: this.bookingDate,
                startTime: this.startTime,
                endTime: this.endTime,
                status: this.status
            })
                .then(result => {
                    this.showToast('', result, 'success');
                    this.resetForm();
                    // this.refreshBookingsList();
                    // return refreshApex(this.wiredRoomsResult);
                    this.dispatchEvent(
                        new CustomEvent('refreshbookings')
                    );

                })
                .catch(error => {
                    this.showToast('', this.getErrorMessage(error), 'error');
                })
                .finally(() => {
                    this.isLoading = false;
                });
        } else {
            // Create new booking
            console.log('inside create method');
            createBooking({
                roomId: this.roomId,
                bookingDate: this.bookingDate,
                startTime: this.startTime,
                endTime: this.endTime,
                status: this.status
            })

            

                .then(result => {
                console.log('result: ', result);

                this.showToast('', result, 'success');
                this.resetForm();
                // this.refreshBookingsList();
                this.dispatchEvent(
                    new CustomEvent('refreshbookings')
                );
            })
                // .catch(error => {
                //     console.error('Save Error:', JSON.stringify(error));
                //     this.showToast('Error', this.getErrorMessage(error), 'error');
                // })
                .catch(error => {
                    console.error('FULL ERROR', JSON.stringify(error));
                    console.error('FULL ERROR OBJECT', error);

                    this.showToast(
                        'Error',
                        this.getErrorMessage(error),
                        'error'
                    );
                })
                .finally(() => {
                    this.isLoading = false;
                });
        }
    }

    handleCancel() {
        this.resetForm();
    }

    // Helper to Convert Time
    convertMillisecondsToTime(milliseconds) {
        if (!milliseconds) return '';

        const totalSeconds = milliseconds / 1000;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        return `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:00`;
    }

    @api handleEdit(event) {
        const booking = event;
        // console.log('booking: ', JSON.stringify(booking));
 
        this.bookingId = booking.Id;
        this.roomId = booking.Room__c;
        this.bookingDate = booking.Date__c;
        // this.startTime = booking.Start_Time__c;
        // this.endTime = booking.End_Time__c;
 
        // Convert milliseconds to HH:mm:ss
        this.startTime = this.convertMillisecondsToTime(booking.Start_Time__c);
        this.endTime = this.convertMillisecondsToTime(booking.End_Time__c);
        this.status = booking.Status__c;
        // console.log('this.status: ', this.status);
 
        this.isEditMode = true;
 
        this.scrollToForm();
    }

    @api async handleDelete(event) {
        const bookingId = event;

        if (!bookingId) {
            this.showToast(
                '',
                'Booking Id missing',
                'error'
            );
            return;
        }

        // Salesforce confirmation modal
        const result = await LightningConfirm.open({
            message: 'Are you sure you want to delete this room booking?',
            variant: 'header',
            label: 'Confirm Delete',
            theme: 'error'
        });

        // User clicked Cancel
        if (!result) {
            return;
        }

        this.isLoading = true;

        deleteBooking({ bookingId })
            .then(() => {
                this.showToast('', 'Booking deleted successfully', 'success');
                this.resetForm();
                // return refreshApex(this.wiredRoomsResult);
                // this.refreshBookingsList();
                this.dispatchEvent(
                    new CustomEvent('refreshbookings')
                );
            })
            .catch(error => {
                this.showToast('', this.getErrorMessage(error), 'error');
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    @api async handleCancelBooking(bookingId) {

        if (!bookingId) {
            this.showToast('', 'Booking Id missing', 'error');
            return;
        }

        const result = await LightningConfirm.open({
            message: 'Are you sure you want to cancel this booking?',
            variant: 'header',
            label: 'Confirm Cancellation',
            theme: 'warning'
        });

        if (!result) {
            return;
        }

        this.isLoading = true;

        updateBooking({
            bookingId: bookingId,
            roomId: null,
            bookingDate: null,
            startTime: null,
            endTime: null,
            status: 'Cancelled'
        })
            .then(() => {

                this.showToast(
                    '',
                    'Booking cancelled successfully',
                    'success'
                );

                this.dispatchEvent(
                    new CustomEvent('refreshbookings')
                );
            })
            .catch(error => {
                this.showToast(
                    '',
                    this.getErrorMessage(error),
                    'error'
                );
            })
            .finally(() => {
                this.isLoading = false;
            });
    }


    validateFields() {
        const roomInput = this.template.querySelector('[data-field="room"]');
        const dateInput = this.template.querySelector('[data-field="date"]');
        const startTimeInput = this.template.querySelector('[data-field="startTime"]');
        const endTimeInput = this.template.querySelector('[data-field="endTime"]');

        let isValid = true;

        if (!this.roomId) {
            roomInput.setCustomValidity('Please select a room');
            isValid = false;
        } else {
            roomInput.setCustomValidity('');
        }

        if (!this.bookingDate) {
            dateInput.setCustomValidity('Booking date is required');
            isValid = false;
        } else {
            dateInput.setCustomValidity('');
        }

        if (!this.startTime) {
            startTimeInput.setCustomValidity('Start time is required');
            isValid = false;
        } else {
            startTimeInput.setCustomValidity('');
        }

        if (!this.endTime) {
            endTimeInput.setCustomValidity('End time is required');
            isValid = false;
        } else {
            endTimeInput.setCustomValidity('');
        }

        // Prevent past time booking for today
        if (
            this.bookingDate &&
            this.startTime &&
            this.isSameDayAsToday(this.bookingDate)
        ) {
            const now = new Date();
            const currentTimeStr = now.toTimeString().split(' ')[0];

            if (this.startTime <= currentTimeStr) {
                startTimeInput.setCustomValidity(
                    'Start time must be in the future for today'
                );
                isValid = false;
            } else {
                startTimeInput.setCustomValidity('');
            }
        }

        // End time validation
        if (this.startTime && this.endTime) {
            if (this.endTime <= this.startTime) {
                endTimeInput.setCustomValidity(
                    'End time must be later than Start time'
                );
                isValid = false;
            } else {
                endTimeInput.setCustomValidity('');
            }
        }

        roomInput.reportValidity();
        dateInput.reportValidity();
        startTimeInput.reportValidity();
        endTimeInput.reportValidity();

        return isValid;
    }

    resetForm() {
        this.bookingId = null;
        this.roomId = null;
        this.bookingDate = null;
        this.startTime = '';
        this.endTime = '';
        this.status = 'Scheduled';
        this.isEditMode = false;

        // Clear validation messages
        const inputs = this.template.querySelectorAll('lightning-input, lightning-combobox');
        inputs.forEach(input => {
            if (input.setCustomValidity) {
                input.setCustomValidity('');
                input.reportValidity();
            }
        });
    }

    // refreshBookingsList() {
    //     this.dispatchEvent(new CustomEvent('refreshbookings'));
    //     if (this.wiredRoomsResult) {
    //         return refreshApex(this.wiredRoomsResult);
    //     }
    //     // return refreshApex(this.wiredRoomsResult);
    // }

    // @api handleCancelBooking(event) {
    //     const bookingId = event.currentTarget.dataset.id;

    //     this.dispatchEvent(new CustomEvent('cancelbooking', {
    //         detail: bookingId
    //     }));
    // }

    scrollToForm() {
        const formElement = this.template.querySelector('.form-container');
        if (formElement) {
            formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }

    getErrorMessage(error) {
        if (error.body && error.body.message) {
            return error.body.message;
        }
        return 'An unexpected error occurred';
    }
}