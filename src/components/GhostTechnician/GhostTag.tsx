/**
 * Floating HTML name/status label, anchored above the ghost's head
 * via drei's <Html> overlay.
 */

import { Html } from '@react-three/drei';
import './ghost-tag.css';

export interface GhostTagProps {
    label: string;
    status?: string;
    /** Local-space y offset from parent group. */
    yOffset?: number;
}

export function GhostTag({ label, status, yOffset = 2.0 }: GhostTagProps) {
    return (
        <Html
            position={[0, yOffset, 0]}
            center
            distanceFactor={6}
            zIndexRange={[100, 0]}
            occlude={false}
        >
            <div className="ghost-tag">
                <span className="ghost-tag__dot" />
                <span className="ghost-tag__label">{label}</span>
                {status && <span className="ghost-tag__status">{status}</span>}
            </div>
        </Html>
    );
}
