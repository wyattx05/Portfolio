function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderTimelineLink(link) {
    const url = escapeHtml(link.url);
    const text = escapeHtml(link.text || 'View Link');

    return `
        <a href="${url}" class="update-link" target="_blank" rel="noopener noreferrer">
            <i class="fas fa-external-link-alt"></i> ${text}
        </a>
    `;
}

function renderTimelineUpdate(update) {
    const date = new Date(update.date);
    const formattedDate = Number.isNaN(date.getTime())
        ? escapeHtml(update.date || '')
        : date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });

    const links = Array.isArray(update.links) && update.links.length > 0
        ? `<div class="update-links">${update.links.map(renderTimelineLink).join('')}</div>`
        : '';

    const tag = update.tag
        ? `<span class="update-tag">${escapeHtml(update.tag)}</span>`
        : '';

    return `
        <article class="timeline-item">
            <div class="timeline-marker"></div>
            <div class="timeline-card">
                <div class="timeline-card-header">
                    <span class="timeline-date">${formattedDate}</span>
                    ${tag}
                </div>
                <h2>${escapeHtml(update.title)}</h2>
                <p>${escapeHtml(update.description || '')}</p>
                ${links}
            </div>
        </article>
    `;
}

async function loadTimeline() {
    const list = document.getElementById('timeline-list');
    if (!list) return;

    try {
        const response = await fetch(`data/content.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error('Timeline content could not be loaded.');
        }

        const content = await response.json();
        const updates = Array.isArray(content.updates) ? content.updates : [];

        if (updates.length === 0) {
            list.innerHTML = '<p class="timeline-loading">No updates yet.</p>';
            return;
        }

        list.innerHTML = updates
            .slice()
            .sort((a, b) => {
                const orderA = Number(a.order) || Number.MAX_SAFE_INTEGER;
                const orderB = Number(b.order) || Number.MAX_SAFE_INTEGER;

                if (orderA !== orderB) {
                    return orderA - orderB;
                }

                return new Date(b.date) - new Date(a.date);
            })
            .map(renderTimelineUpdate)
            .join('');
    } catch (error) {
        list.innerHTML = `<p class="timeline-loading">${escapeHtml(error.message)}</p>`;
    }
}

document.addEventListener('DOMContentLoaded', loadTimeline);
