import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { useLoader } from '@react-three/fiber';

const Model = ({ url }) => {
    const geom = useLoader(STLLoader, url);
    return (
        <mesh geometry={geom}>
            <meshStandardMaterial color="#f0f4f8" roughness={0.3} metalness={0.1} />
        </mesh>
    );
};

const STLViewer = ({ url }) => {
    if (!url) return null;

    return (
        <div style={{ width: '100%', height: '400px', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--accent-light)', position: 'relative' }}>
            <Canvas shadows camera={{ position: [0, 0, 100], fov: 50 }}>
                <Suspense fallback={null}>
                    <Stage environment="city" intensity={0.6} contactShadow opacity={0.5} blur={2}>
                        <Model url={url} />
                    </Stage>
                </Suspense>
                <OrbitControls autoRotate autoRotateSpeed={1.0} enableZoom={true} makeDefault />
            </Canvas>
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.8)', padding: '2px 6px', borderRadius: '4px', pointerEvents: 'none' }}>
                ЛКМ - вращение | Колесико - масштаб
            </div>
        </div>
    );
};

export default STLViewer;
