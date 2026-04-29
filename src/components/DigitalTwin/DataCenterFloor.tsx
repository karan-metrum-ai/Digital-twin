/**
 * DataCenterFloor Component
 *
 * Renders a single floor of a multi-floor data center building.
 * Combines the environment, network cables, and server racks
 * with a vertical offset for stacking in building view.
 */

import { Suspense } from 'react';
import { ServerRack } from './ServerRack';
import { DataCenterEnvironment } from './DataCenterEnvironment';
import { NetworkCables } from './NetworkCables';
import type { Rack3D, Device3D } from './types';

interface DataCenterFloorProps {
    floorNumber: number;
    regionName: string;
    racks: Rack3D[];
    yOffset: number;
    selectedDeviceIds: Set<string>;
    selectedRackId: string | null;
    onDeviceClick: (device: Device3D) => void;
    onToggleSelection: (deviceId: string, isSelected: boolean) => void;
    onRackClick: (rackId: string) => void;
}

export function DataCenterFloor({
    floorNumber,
    regionName,
    racks,
    yOffset,
    selectedDeviceIds,
    selectedRackId,
    onDeviceClick,
    onToggleSelection,
    onRackClick,
}: DataCenterFloorProps) {
    // Adjust rack positions with floor offset
    const adjustedRacks = racks.map((rack) => ({
        ...rack,
        position: [
            rack.position[0],
            rack.position[1] + yOffset,
            rack.position[2],
        ] as [number, number, number],
    }));

    return (
        <group position={[0, yOffset, 0]}>
            <Suspense fallback={null}>
                <DataCenterEnvironment
                    regionName={`${regionName} - Floor ${floorNumber}`}
                />
                <NetworkCables racks={adjustedRacks} />
                {adjustedRacks.map((rack) => (
                    <ServerRack
                        key={`floor-${floorNumber}-${rack.rack_id}`}
                        rack={rack}
                        selectedDeviceIds={selectedDeviceIds}
                        selectedRackId={selectedRackId}
                        onRackClick={onRackClick}
                        onDeviceClick={onDeviceClick}
                        onToggleSelection={onToggleSelection}
                    />
                ))}
            </Suspense>
        </group>
    );
}

export default DataCenterFloor;

