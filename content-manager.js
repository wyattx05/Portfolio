// Content Management System
class ContentManager {
    constructor() {
        this.content = null;
        this.init();
    }

    async init() {
        await this.loadContent();
        this.renderContent();
    }

    async loadContent() {
        try {
            // Try to load from API first (if server is running)
            const response = await fetch('/api/content');
            if (response.ok) {
                this.content = await response.json();
                return;
            }
        } catch (error) {
            console.log('API not available, falling back to static file');
        }
        
        try {
            // Fallback to static JSON file
            const response = await fetch('data/content.json');
            this.content = await response.json();
        } catch (error) {
            console.error('Error loading content:', error);
            // Fallback to static content if JSON fails to load
        }
    }

    renderContent() {
        if (!this.content) return;
        
        this.renderProjects();
        this.renderCertifications();
        this.renderUpdates();
        this.renderSkills();
    }

    renderProjects() {
        const projectsGrid = document.querySelector('.projects-grid');
        if (!projectsGrid || !this.content.projects) return;

        const featuredProjects = this.content.projects
            .filter(project => project.featured)
            .sort((a, b) => a.order - b.order);

        projectsGrid.innerHTML = featuredProjects.map(project => `
            <div class="project-card">
                <div class="project-image">
                    <i class="${project.icon}"></i>
                </div>
                <div class="project-content">
                    <h3>${project.title}</h3>
                    <p class="project-description">${project.description}</p>
                    <div class="project-tags">
                        ${project.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                    <div class="project-links">
                        ${project.links.map(link => `
                            <a href="${link.url}" class="project-link" target="_blank">
                                <i class="${this.getLinkIcon(link.type)}"></i> ${link.text}
                            </a>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderCertifications() {
        const certificationsGrid = document.querySelector('.certifications-grid');
        if (!certificationsGrid || !this.content.certifications) return;

        const sortedCertifications = this.content.certifications
            .sort((a, b) => a.order - b.order);

        certificationsGrid.innerHTML = sortedCertifications.map(cert => `
            <a href="${cert.pdfPath}" class="cert-card" target="_blank" title="View ${cert.title} Certificate">
                <div class="cert-icon">
                    <i class="${cert.icon}"></i>
                </div>
                <div class="cert-content">
                    <h4>${cert.title}</h4>
                    <p class="cert-issuer">${cert.issuer}</p>
                    <p class="cert-date">${cert.date}</p>
                </div>
            </a>
        `).join('');
    }

    renderUpdates() {
        const updatesGrid = document.querySelector('.updates-grid');
        if (!updatesGrid || !this.content.updates) return;

        const sortedUpdates = this.content.updates
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        updatesGrid.innerHTML = sortedUpdates.map(update => {
            const date = new Date(update.date);
            const month = date.toLocaleDateString('en-US', { month: 'long' });
            const year = date.getFullYear();

            return `
                <div class="update-card">
                    <div class="update-date">
                        <span class="month">${month}</span>
                        <span class="year">${year}</span>
                    </div>
                    <div class="update-content">
                        <h3>${update.title}</h3>
                        <p>${update.description}</p>
                        <span class="update-tag">${update.tag}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderSkills() {
        const skillsGrid = document.querySelector('.skills-grid');
        if (!skillsGrid || !this.content.skills) return;

        const sortedSkills = this.content.skills
            .sort((a, b) => a.order - b.order);

        skillsGrid.innerHTML = sortedSkills.map(skill => `
            <div class="skill-card">
                <div class="skill-icon">
                    <i class="${skill.icon}"></i>
                </div>
                <h3>${skill.title}</h3>
                <p>${skill.description}</p>
            </div>
        `).join('');
    }

    getLinkIcon(type) {
        const icons = {
            'github': 'fab fa-github',
            'website': 'fas fa-external-link-alt',
            'demo': 'fas fa-play',
            'video': 'fas fa-video'
        };
        return icons[type] || 'fas fa-link';
    }

    // Methods for admin interface to update content
    async saveContent() {
        try {
            const response = await fetch('/api/content', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.content)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Content saved successfully:', result);
                return { success: true, message: result.message };
            } else {
                const error = await response.json();
                console.error('Failed to save content:', error);
                return { success: false, message: error.error || 'Failed to save content' };
            }
        } catch (error) {
            console.error('Error saving content:', error);
            return { success: false, message: 'Network error: Could not connect to server' };
        }
    }

    addProject(project) {
        if (!this.content.projects) this.content.projects = [];
        project.id = 'proj_' + Date.now();
        project.order = this.content.projects.length + 1;
        this.content.projects.push(project);
        this.renderProjects();
    }

    updateProject(id, updatedProject) {
        const index = this.content.projects.findIndex(p => p.id === id);
        if (index !== -1) {
            this.content.projects[index] = { ...this.content.projects[index], ...updatedProject };
            this.renderProjects();
        }
    }

    deleteProject(id) {
        this.content.projects = this.content.projects.filter(p => p.id !== id);
        this.renderProjects();
    }

    addCertification(cert) {
        if (!this.content.certifications) this.content.certifications = [];
        cert.id = 'cert_' + Date.now();
        cert.order = this.content.certifications.length + 1;
        this.content.certifications.push(cert);
        this.renderCertifications();
    }

    updateCertification(id, updatedCert) {
        const index = this.content.certifications.findIndex(c => c.id === id);
        if (index !== -1) {
            this.content.certifications[index] = { ...this.content.certifications[index], ...updatedCert };
            this.renderCertifications();
        }
    }

    deleteCertification(id) {
        this.content.certifications = this.content.certifications.filter(c => c.id !== id);
        this.renderCertifications();
    }

    addUpdate(update) {
        if (!this.content.updates) this.content.updates = [];
        update.id = 'update_' + Date.now();
        update.order = this.content.updates.length + 1;
        this.content.updates.push(update);
        this.renderUpdates();
    }

    updateUpdate(id, updatedUpdate) {
        const index = this.content.updates.findIndex(u => u.id === id);
        if (index !== -1) {
            this.content.updates[index] = { ...this.content.updates[index], ...updatedUpdate };
            this.renderUpdates();
        }
    }

    deleteUpdate(id) {
        this.content.updates = this.content.updates.filter(u => u.id !== id);
        this.renderUpdates();
    }
}

// Initialize content manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.contentManager = new ContentManager();
});
