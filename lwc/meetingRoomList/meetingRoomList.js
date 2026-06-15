import { LightningElement, wire, track } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import getAllRooms from '@salesforce/apex/MeetingRoomController.getAllRooms';
import searchRooms from '@salesforce/apex/MeetingRoomController.searchRooms';

export default class MeetingRoomList extends LightningElement {
    @track rooms = [];
    @track filteredRooms = [];
    @track searchTerm = '';
    @track isLoading = false;

    wiredRoomsResult;

    @wire(getAllRooms)
    wiredRooms(result) {
        this.wiredRoomsResult = result;
        if (result.data) {
            // this.rooms = result.data;
            // this.filteredRooms = result.data;
            this.rooms = result.data.map(room => {
                return {
                    ...room,
                    availabilityClass: room.Is_Available__c
                        ? 'status-badge available'
                        : 'status-badge unavailable',

                    availabilityText: room.Is_Available__c
                        ? 'Available'
                        : 'Unavailable'
                };
            });

            this.filteredRooms = [...this.rooms];
        } else if (result.error) {
            console.error('Error loading rooms:', result.error);
        }
    }

    get hasRooms() {
        return this.filteredRooms && this.filteredRooms.length > 0;
    }

    get roomCount() {
        return this.filteredRooms ? this.filteredRooms.length : 0;
    }

    handleSearch(event) {
        this.searchTerm = event.target.value;

        if (this.searchTerm) {
            this.performSearch();
        } else {
            this.filteredRooms = [...this.rooms];
        }
    }

    performSearch() {
        this.isLoading = true;

        searchRooms({ searchTerm: this.searchTerm })
            .then(result => {

                this.filteredRooms = result.map(room => {
                    return {
                        ...room,
                        availabilityClass: room.Is_Available__c
                            ? 'status-badge available'
                            : 'status-badge unavailable',

                        availabilityText: room.Is_Available__c
                            ? 'Available'
                            : 'Unavailable'
                    };
                });

            })
            .catch(error => {
                console.error('Error searching rooms:', error);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    handleEdit(event) {
        const roomId = event.currentTarget.dataset.id;
        // console.log('roomId: ', roomId);
        const room = this.filteredRooms.find(r => r.Id === roomId);
        // const room = JSON.stringify(roomData);
        // console.log('room: ', JSON.stringify(room));

        if (room) {
            this.dispatchEvent(new CustomEvent('editroom', {
                detail: room
            }));
        }
    }

    handleDelete(event) {
        const roomId = event.currentTarget.dataset.id;

        this.dispatchEvent(new CustomEvent('deleteroom', {
            detail: roomId
        }));
    }

    handleRefresh() {
        this.isLoading = true;
        refreshApex(this.wiredRoomsResult)
            .finally(() => {
                this.isLoading = false;
            });
    }

    // getAvailabilityClass(isAvailable) {
    //     return isAvailable ? 'status-badge available' : 'status-badge unavailable';
    // }

    // getAvailabilityText(isAvailable) {
    //     return isAvailable ? 'Available' : 'Unavailable';
    // }
}