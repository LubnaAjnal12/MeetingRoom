import { LightningElement } from 'lwc';

export default class MeetingRoomManager extends LightningElement {

    // handleEditRoom(event) {
    //     const formComponent = this.template.querySelector('c-meeting-room-form');
    //     console.log('formComponent: ', formComponent);
    //     if (formComponent) {
    //         formComponent.handleEdit(event);
    //     }
    // }

    handleEditRoom(event) {
        // console.log('event: ', event.detail);
        const formComponent = this.template.querySelector('c-meeting-room-form');
        // console.log('formComponent: ', formComponent);

        if (formComponent) {
            formComponent.loadRoomForEdit(event.detail);
        }
    }

    handleDeleteRoom(event) {
        const formComponent = this.template.querySelector('c-meeting-room-form');

        if (formComponent) {
            formComponent.deleteRoomRecord(event.detail);
        }
    }
    
    // handleDeleteRoom(event) {
    //     const formComponent = this.template.querySelector('c-meeting-room-form');
    //     if (formComponent) {
    //         formComponent.handleDelete(event);
    //     }
    // }

    handleRefreshRooms() {
        const listComponent = this.template.querySelector('c-meeting-room-list');
        if (listComponent) {
            listComponent.handleRefresh();
        }
    }
}