import React from 'react';
import '../index.css';

const getAllTeeth = () => {
    const tr = [18, 17, 16, 15, 14, 13, 12, 11];
    const tl = [21, 22, 23, 24, 25, 26, 27, 28];
    const br = [48, 47, 46, 45, 44, 43, 42, 41];
    const bl = [31, 32, 33, 34, 35, 36, 37, 38];
    return { tr, tl, br, bl };
};

const ToothFormula = ({ selectedTeeth, onChange }) => {
    const { tr, tl, br, bl } = getAllTeeth();

    const handleToggle = (num) => {
        let newSelection = [...selectedTeeth];
        if (newSelection.includes(num)) {
            newSelection = newSelection.filter(t => t !== num);
        } else {
            newSelection.push(num);
        }
        onChange(newSelection);
    };

    const renderRow = (teethArray) => (
        <div className="flex gap-2">
            {teethArray.map(num => (
                <button
                    key={num}
                    type="button"
                    onClick={() => handleToggle(num)}
                    className={`btn ${selectedTeeth.includes(num) ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ width: '40px', height: '40px', padding: 0, borderRadius: 'var(--radius-sm)', transition: 'transform 0.2s', transform: selectedTeeth.includes(num) ? 'scale(1.1)' : 'scale(1)' }}
                >
                    {num}
                </button>
            ))}
        </div>
    );

    return (
        <div className="flex flex-col items-center gap-4" style={{ width: '100%' }}>
            <div className="flex flex-col gap-4 w-full" style={{ overflowX: 'auto', padding: '1rem' }}>
                {/* Upper Jaw */}
                <div className="flex justify-center gap-6" style={{ borderBottom: '2px solid var(--accent-light)', paddingBottom: '1rem', minWidth: 'max-content' }}>
                    {renderRow(tr)}
                    <div style={{ width: '2px', backgroundColor: 'var(--accent-light)' }}></div>
                    {renderRow(tl)}
                </div>
                {/* Lower Jaw */}
                <div className="flex justify-center gap-6" style={{ paddingTop: '0.5rem', minWidth: 'max-content' }}>
                    {renderRow(br)}
                    <div style={{ width: '2px', backgroundColor: 'var(--accent-light)' }}></div>
                    {renderRow(bl)}
                </div>
            </div>

            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                Выбрано зубов: {selectedTeeth.length}
            </div>
        </div>
    );
};

export default ToothFormula;
