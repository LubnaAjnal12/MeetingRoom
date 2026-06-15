import { LightningElement } from 'lwc';

export default class RoomBookingManager extends LightningElement {
    
    handleEditBooking(event) {
        const formComponent = this.template.querySelector('c-room-booking-form');
        if (formComponent) {
            formComponent.handleEdit(event.detail);
        }
    }
    
    handleDeleteBooking(event) {
        const formComponent = this.template.querySelector('c-room-booking-form');
        if (formComponent) {
            formComponent.handleDelete(event.detail);
        }
    }
    
    handleCancelBooking(event) {
        const formComponent = this.template.querySelector('c-room-booking-form');
        if (formComponent) {
            formComponent.handleCancelBooking(event.detail);
        }
    }
    
    handleRefreshBookings() {
        const listComponent = this.template.querySelector('c-room-booking-list');
        if (listComponent) {
            listComponent.handleRefresh();
        }
    }
}