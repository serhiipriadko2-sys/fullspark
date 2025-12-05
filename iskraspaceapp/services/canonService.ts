
import { memoryService } from './memoryService';
import { canonData } from '../data/canonData';
import { MemoryNode } from '../types';

const CANON_SEEDED_KEY = 'iskra-canon-seeded-v2'; // versioned key

class CanonService {
    public seedCanon(): void {
        try {
            const isSeeded = localStorage.getItem(CANON_SEEDED_KEY);
            if (isSeeded) {
                return;
            }

            console.log('Seeding canon knowledge base...');
            
            canonData.forEach(doc => {
                const nodeType = 'artifact';
                const node: Partial<MemoryNode> = {
                    title: doc.filename,
                    type: nodeType,
                    layer: 'archive',
                    doc_type: 'canon',
                    content: doc.content,
                    tags: ['canon', `_type:${nodeType}`, doc.filename.split('/').pop()?.replace(/\.md|\.txt|\.csv/, '')],
                    evidence: [{
                        source: 'Internal Canon Document',
                        inference: 'This document is part of the core knowledge base of Iskra.',
                        fact: 'true',
                        trace: `Loaded from ${doc.filename}`,
                    }]
                };
                memoryService.addArchiveEntry(node);
            });

            localStorage.setItem(CANON_SEEDED_KEY, 'true');
            console.log('Canon knowledge base seeded.');
        } catch (error) {
            console.error("Error seeding canon data:", error);
            // If seeding fails (e.g. localStorage is full), don't try again on next load
            // to avoid repeated errors. A more robust solution might involve clearing
            // some data or notifying the user.
            localStorage.setItem(CANON_SEEDED_KEY, 'failed');
        }
    }
}

export const canonService = new CanonService();