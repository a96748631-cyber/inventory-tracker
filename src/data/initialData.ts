import { InventoryItem } from '../types';
import {
  SAMPLE_TRUCK_BRAKE_IMAGE,
  SAMPLE_BUS_DOOR_IMAGE,
  SAMPLE_TRAILER_BELLOWS_IMAGE,
} from './samplePartImages';

export const INITIAL_INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: 'mashkay-part-001',
    partNumber: 'MK-TRK-7420',
    itemName: 'Heavy-Duty Spring Brake Chamber (Type 30/30 Sealed)',
    partDescription: 'Double-diaphragm sealed emergency and service actuator built for heavy-duty commercial truck drive axles, featuring anti-corrosive epoxy housing and tamper-proof safety clamping.',
    category: 'Truck Parts',
    imageUrl: SAMPLE_TRUCK_BRAKE_IMAGE,
    supplierName: 'Wabco Commercial Vehicle Systems',
    unitPrice: 145.00,
    quantityInStock: 12,
    reorderLevel: 20,
    lastRestockedDate: '2026-07-28',
    compatibility: 'Volvo FH16, Scania R-Series, Actros 3340',
    oemReference: 'OEM-WAB-925374'
  },
  {
    id: 'mashkay-part-002',
    partNumber: 'MK-BUS-2195',
    itemName: 'Pneumatic Passenger Door Actuator Cylinder Assembly',
    partDescription: 'Smooth double-acting linear pneumatic actuator with integrated speed throttling control and emergency manual override for transit and city bus passenger ingress doors.',
    category: 'Bus Parts',
    imageUrl: SAMPLE_BUS_DOOR_IMAGE,
    supplierName: 'Knorr-Bremse Commercial Vehicle Systems',
    unitPrice: 320.00,
    quantityInStock: 28,
    reorderLevel: 15,
    lastRestockedDate: '2026-08-14',
    compatibility: 'Mercedes-Benz Citaro, MAN Lion’s Coach',
    oemReference: 'OEM-BOS-418290'
  },
  {
    id: 'mashkay-part-003',
    partNumber: 'MK-TRL-9841',
    itemName: 'Tri-Axle Air Suspension Rolling Lobe Bellows',
    partDescription: 'Reinforced multi-ply vulcanized elastomer rolling lobe air spring with high-tensile steel bead plate, absorbing road shock and maintaining ride height on heavy-haul trailers.',
    category: 'Trailer Parts',
    imageUrl: SAMPLE_TRAILER_BELLOWS_IMAGE,
    supplierName: 'SAF-Holland Group',
    unitPrice: 189.50,
    quantityInStock: 8,
    reorderLevel: 10,
    lastRestockedDate: '2026-08-02',
    compatibility: 'SAF-Holland, BPW Eco Plus, Schmitz Cargobull',
    oemReference: 'OEM-CNT-1T19L7'
  }
];
