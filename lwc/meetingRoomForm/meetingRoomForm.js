import { LightningElement, track, wire, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import LightningConfirm from 'lightning/confirm';
import getAllRooms from '@salesforce/apex/MeetingRoomController.getAllRooms';
import saveRoom from '@salesforce/apex/MeetingRoomController.saveRoom';
import deleteRoom from '@salesforce/apex/MeetingRoomController.deleteRoom';

export default class MeetingRoomForm extends LightningElement {
    @track roomId = null;
    @track roomName = '';
    @track capacity = null;
    @track location = '';
    @track isAvailable = true;
    @track isLoading = false;
    @track isEditMode = false;

    wiredRoomsResult;

    // @wire(getAllRooms)
    // wiredRooms(result) {
    //     this.wiredRoomsResult = result;
    // }

    @wire(getAllRooms)
    wiredRooms(result) {
        this.wiredRoomsResult = result;

        if (result.data) {
            // console.log('Rooms loaded');
        } else if (result.error) {
            console.error(result.error);
        }
    }

    get formTitle() {
        return this.isEditMode ? 'Edit Meeting Room' : 'Create New Meeting Room';
    }

    get saveButtonLabel() {
        return this.isEditMode ? 'Update Room' : 'Create Room';
    }

    get showCancelButton() {
        return this.isEditMode;
    }

    handleNameChange(event) {
        this.roomName = event.target.value;
    }

    handleCapacityChange(event) {
        this.capacity = event.target.value;
    }

    handleLocationChange(event) {
        this.location = event.target.value;
    }

    handleAvailabilityChange(event) {
        this.isAvailable = event.target.checked;
    }

    handleSave() {
        // Validate fields
        if (!this.validateFields()) {
            return;
        }

        this.isLoading = true;

        const room = {
            Id: this.roomId,
            Name: this.roomName,
            Capacity__c: this.capacity,
            Location__c: this.location,
            Is_Available__c: this.isAvailable
        };

        saveRoom({ room })
            .then(() => {
                this.showToast(
                    '',
                    `Meeting room ${this.isEditMode ? 'updated' : 'created'} successfully`,
                    'success'
                );
                this.resetForm();
                this.refreshRoomsList();
            })
            // .catch(error => {
            //     this.showToast('Error', this.getErrorMessage(error), 'error');
            // })
            .catch(error => {
                console.error('Save Error:', JSON.stringify(error));

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

    handleCancel() {
        this.resetForm();
    }

    // handleEdit(event) {
    //     const room = event.detail;
    //     this.roomId = room.Id;
    //     this.roomName = room.Name;
    //     this.capacity = room.Capacity__c;
    //     this.location = room.Location__c;
    //     this.isAvailable = room.Is_Available__c;
    //     this.isEditMode = true;

    //     // Scroll to form
    //     this.scrollToForm();
    // }

    @api loadRoomForEdit(room) {

        // console.log('Editing Room:', JSON.stringify(room));

        this.roomId = room.Id;
        this.roomName = room.Name;
        this.capacity = room.Capacity__c;
        this.location = room.Location__c;
        this.isAvailable = room.Is_Available__c;
        this.isEditMode = true;

        this.scrollToForm();
    }

    // handleDelete(event) {
    //     const roomId = event.detail;

    //     // Check roomId
    //     if (!roomId) {
    //         this.showToast('Error', 'Room Id not found', 'error');
    //         return;
    //     }

    //     this.isLoading = true;

    //     deleteRoom({ roomId: roomId })
    //         .then(() => {
    //             this.showToast(
    //                 'Success',
    //                 'Meeting room deleted successfully',
    //                 'success'
    //             );

    //             this.resetForm();

    //             return refreshApex(this.wiredRoomsResult);
    //         })
    //         .catch(error => {
    //             console.error('Delete Error:', JSON.stringify(error));

    //             this.showToast(
    //                 'Error',
    //                 this.getErrorMessage(error),
    //                 'error'
    //             );
    //         })
    //         .finally(() => {
    //             this.isLoading = false;
    //         });
    // }

    @api async deleteRoomRecord(roomId) {

        if (!roomId) {
            this.showToast(
                'Error',
                'Room Id missing',
                'error'
            );
            return;
        }

        // Salesforce confirmation modal
        const result = await LightningConfirm.open({
            message: 'Are you sure you want to delete this meeting room?',
            variant: 'header',
            label: 'Confirm Delete',
            theme: 'error'
        });

        // User clicked Cancel
        if (!result) {
            return;
        }

        this.isLoading = true;

        deleteRoom({ roomId: roomId })
            .then(() => {

                this.showToast(
                    '',
                    'Meeting room deleted successfully',
                    'success'
                );

                this.resetForm();

                return refreshApex(this.wiredRoomsResult);
            })
            .catch(error => {

                console.error(
                    'Delete Error:',
                    JSON.stringify(error)
                );

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

    validateFields() {
        const nameInput = this.template.querySelector('[data-field="name"]');
        const capacityInput = this.template.querySelector('[data-field="capacity"]');
        const locationInput = this.template.querySelector('[data-field="location"]');

        let isValid = true;

        if (!this.roomName) {
            nameInput.setCustomValidity('Room name is required');
            isValid = false;
        } else {
            nameInput.setCustomValidity('');
        }

        if (!this.capacity || this.capacity <= 0) {
            capacityInput.setCustomValidity('Capacity must be greater than 0');
            isValid = false;
        } else {
            capacityInput.setCustomValidity('');
        }

        if (!this.location) {
            locationInput.setCustomValidity('Location is required');
            isValid = false;
        } else {
            locationInput.setCustomValidity('');
        }

        nameInput.reportValidity();
        capacityInput.reportValidity();
        locationInput.reportValidity();

        return isValid;
    }

    resetForm() {
        this.roomId = null;
        this.roomName = '';
        this.capacity = null;
        this.location = '';
        this.isAvailable = true;
        this.isEditMode = false;

        // Clear validation messages
        // const inputs = this.template.querySelectorAll('lightning-input');
        // inputs.forEach(input => {
        //     input.setCustomValidity('');
        //     input.reportValidity();
        // });
        const inputs = this.template.querySelectorAll('lightning-input');

        if (inputs) {
            inputs.forEach(input => {
                input.setCustomValidity('');
                input.reportValidity();
            });
        }
    }

    refreshRoomsList() {
        // Dispatch event to refresh rooms list
        // this.dispatchEvent(new CustomEvent('refreshrooms'));

        // Also refresh wired data
        // return refreshApex(this.wiredRoomsResult);
        if (this.wiredRoomsResult) {
            return refreshApex(this.wiredRoomsResult);
        }
    }

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