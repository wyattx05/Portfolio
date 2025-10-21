// Portfolio Content Management System
class ContentManager {
    constructor() {
        this.content = null;
        this.initialized = false;
        this.fallbackContent = this.getFallbackContent();
        this.init();
    }

    async init() {
        if (this.initialized) return;
        
        await this.loadContent();
        this.renderContent();
        this.initialized = true;
    }

    async loadContent() {
        try {
            // Try API first (local development)
            const response = await fetch('/api/content');
            if (response.ok) {
                this.content = await response.json();
                return;
            }
        } catch (error) {
            console.log('API not available, loading from static file');
        }
        
        try {
            // Fallback to static JSON (production)
            const response = await fetch(`data/content.json?t=${Date.now()}`);
            if (response.ok) {
                this.content = await response.json();
                return;
            }
        } catch (error) {
            console.warn('Content file not available, using fallback');
        }
        
        // Final fallback to hardcoded content
        this.content = this.fallbackContent;
    }

    getFallbackContent() {
        return {
            personalInfo: {
                name: "Wyatt Anderson",
                title: "Information Systems Student & Tech Enthusiast",
                profileImage: "assets/images/profile.jpeg",
                resumePath: "assets/documents/Resume.pdf",
                email: "whanderson024@gmail.com",
                aboutText: [
                    "I am a dedicated Information Systems student at Virginia Commonwealth University with a passion for technology and innovation.",
                    "My focus areas include AI, data analysis, and system administration, with hands-on experience in Python, Docker, and various development frameworks."
                ],
                socialLinks: {
                    linkedin: "https://www.linkedin.com/in/wyatt-anderson609",
                    github: "https://github.com/wyattx05",
                    instagram: "https://instagram.com/wyattx05",
                    handshake: "https://app.joinhandshake.com/profiles/6pd9rm"
                }
            }
        };
    }

    renderContent() {
        if (!this.content) return;
        
        this.renderPersonalInfo();
        this.renderProjects();
        this.renderCertifications();
        this.renderBlog();
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

    renderBlog() {
        const blogGrid = document.querySelector('.blog-posts-grid');
        if (!blogGrid || !this.content.blog) return;

        const publishedPosts = this.content.blog
            .filter(post => post.status === 'published')
            .sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));

        if (publishedPosts.length === 0) {
            blogGrid.innerHTML = '<p class="no-posts">No blog posts yet. Check back soon!</p>';
            return;
        }

        blogGrid.innerHTML = publishedPosts.map(post => {
            const publishDate = new Date(post.publishDate);
            const formattedDate = publishDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });

            return `
                <article class="blog-post-card">
                    ${post.images && post.images.length > 0 ? `
                        <div class="blog-post-image">
                            <img src="${post.images[0].url}" alt="${post.images[0].alt || post.title}" loading="lazy">
                        </div>
                    ` : ''}
                    <div class="blog-post-content">
                        <div class="blog-post-meta">
                            <span class="blog-post-date">${formattedDate}</span>
                            <span class="blog-post-author">by ${post.author}</span>
                        </div>
                        <h3 class="blog-post-title">${post.title}</h3>
                        <p class="blog-post-excerpt">${post.excerpt}</p>
                        ${post.tags && post.tags.length > 0 ? `
                            <div class="blog-post-tags">
                                ${post.tags.map(tag => `<span class="blog-tag">${tag}</span>`).join('')}
                            </div>
                        ` : ''}
                        ${post.links && post.links.length > 0 ? `
                            <div class="blog-post-links">
                                ${post.links.map(link => `
                                    <a href="${link.url}" class="blog-link" target="_blank" rel="noopener noreferrer">
                                        <i class="fas fa-external-link-alt"></i> ${link.text}
                                    </a>
                                `).join('')}
                            </div>
                        ` : ''}
                        <div class="blog-post-content-preview">
                            ${this.truncateHtml(post.content, 200)}
                        </div>
                        <div class="blog-post-actions">
                            <button class="blog-read-more-btn" onclick="window.contentManager.openBlogModal('${post.id}')">
                                <i class="fas fa-book-open"></i> Read Full Post
                            </button>
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    }

    truncateHtml(html, maxLength) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const text = tempDiv.textContent || tempDiv.innerText || '';
        
        if (text.length <= maxLength) return html;
        
        const truncated = text.substring(0, maxLength);
        const lastSpaceIndex = truncated.lastIndexOf(' ');
        const finalText = lastSpaceIndex > 0 ? truncated.substring(0, lastSpaceIndex) : truncated;
        
        return finalText + '...';
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
                        ${update.links && update.links.length > 0 ? `
                            <div class="update-links">
                                ${update.links.map(link => `
                                    <a href="${link.url}" class="update-link" target="_blank">
                                        <i class="${this.getUpdateLinkIcon(link.type)}"></i> ${link.text}
                                    </a>
                                `).join('')}
                            </div>
                        ` : ''}
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

    getUpdateLinkIcon(type) {
        const icons = {
            'article': 'fas fa-newspaper',
            'website': 'fas fa-external-link-alt',
            'project': 'fas fa-folder-open',
            'announcement': 'fas fa-bullhorn',
            'photo': 'fas fa-camera',
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

    renderPersonalInfo() {
        // Set default content first
        const heroTitle = document.querySelector('.hero-content h1');
        const heroSubtitle = document.querySelector('.hero-content h2');
        const profileImage = document.querySelector('.profile-photo');
        const resumeLink = document.querySelector('a[download]');
        
        // Set defaults if no content loaded
        if (!this.content?.personalInfo) {
            if (heroTitle) this.typeWriter(heroTitle, "Hi, I'm Wyatt Anderson", 60);
            if (heroSubtitle) heroSubtitle.textContent = "Information Systems Student & Tech Enthusiast";
            if (profileImage) profileImage.src = "assets/images/profile.jpeg";
            if (resumeLink) {
                resumeLink.href = "assets/documents/Resume.pdf";
                resumeLink.setAttribute('download', 'Wyatt_Anderson_Resume.pdf');
            }
            
            // Set default about-links
            const aboutLinks = document.querySelector('.about-links');
            if (aboutLinks) {
                aboutLinks.innerHTML = `
                    <a href="mailto:whanderson024@gmail.com" class="about-icon-btn" title="Email me">
                        <i class="fas fa-envelope"></i>
                    </a>
                    <a href="https://www.linkedin.com/in/wyatt-anderson609" target="_blank" class="about-icon-btn" title="LinkedIn Profile">
                        <i class="fab fa-linkedin"></i>
                    </a>
                `;
            }
            return;
        }

        const personal = this.content.personalInfo;
        
        if (heroTitle) {
            this.typeWriter(heroTitle, `Hi, I'm ${personal.name}`, 60);
        }
        if (heroSubtitle) heroSubtitle.textContent = personal.title;
        if (profileImage && personal.profileImage) profileImage.src = personal.profileImage;
        if (resumeLink && personal.resumePath) {
            resumeLink.href = personal.resumePath;
            resumeLink.setAttribute('download', 'Wyatt_Anderson_Resume.pdf');
        }
        
        // Update about section
        const aboutText = document.querySelector('.about-text');
        if (aboutText && personal.aboutText) {
            const paragraphs = aboutText.querySelectorAll('p');
            if (paragraphs.length >= 2) {
                paragraphs[0].textContent = personal.aboutText[0];
                paragraphs[1].textContent = personal.aboutText[1];
            }
        }
        
        // Update about-links section (ensure LinkedIn resolves for object or array formats)
        const aboutLinks = document.querySelector('.about-links');
        if (aboutLinks && personal.email) {
            let linkedinUrl = '#';
            const sl = personal.socialLinks;
            if (Array.isArray(sl)) {
                const ln = sl.find(l => (l.label || '').toLowerCase().includes('linkedin'));
                linkedinUrl = ln?.url || '#';
            } else if (sl && sl.linkedin) {
                linkedinUrl = typeof sl.linkedin === 'string' ? sl.linkedin : (sl.linkedin.url || '#');
            }
            aboutLinks.innerHTML = `
                <a href="mailto:${personal.email}" class="about-icon-btn" title="Email me">
                    <i class="fas fa-envelope"></i>
                </a>
                <a href="${linkedinUrl}" target="_blank" class="about-icon-btn" title="LinkedIn Profile">
                    <i class="fab fa-linkedin"></i>
                </a>
            `;
        }
        
        // Update contact section with dynamic social links
        this.renderSocialLinks();
    }

    renderSocialLinks() {
        const socialLinksContainer = document.querySelector('.secondary-contacts');
        if (!socialLinksContainer || !this.content?.personalInfo?.socialLinks) return;

        const raw = this.content.personalInfo.socialLinks;
        
        // Normalize into array of { label, url, icon }
        const linksArray = Array.isArray(raw)
            ? raw
            : Object.entries(raw).map(([key, urlOrData]) => ({
                label: this.capitalizeFirst(key),
                url: typeof urlOrData === 'string' ? urlOrData : urlOrData.url,
                icon: typeof urlOrData === 'object' ? urlOrData.icon : null,
                key
            }));
        
        // Define icon mapping for common social platforms
        const iconMapping = {
            'linkedin': 'fab fa-linkedin',
            'github': 'fab fa-github', 
            'instagram': 'fab fa-instagram',
            'twitter': 'fab fa-twitter',
            'facebook': 'fab fa-facebook',
            'youtube': 'fab fa-youtube',
            'tiktok': 'fab fa-tiktok',
            'discord': 'fab fa-discord',
            'twitch': 'fab fa-twitch',
            'handshake': 'fas fa-handshake',
            'portfolio': 'fas fa-globe',
            'website': 'fas fa-globe',
            'email': 'fas fa-envelope',
            'phone': 'fas fa-phone',
            'resume': 'fas fa-file-alt',
            'cv': 'fas fa-file-alt',
            'behance': 'fab fa-behance',
            'dribbble': 'fab fa-dribbble'
        };

        const getIconClass = (label, customIcon, key) => {
            if (customIcon) return customIcon;
            const lookup = (label || key || '').toString().toLowerCase();
            return iconMapping[lookup] || 'fas fa-link';
        };

        // Generate HTML for all social links
        socialLinksContainer.innerHTML = linksArray
            .map(link => {
                const iconClass = getIconClass(link.label, link.icon, link.key);
                const title = link.label || this.capitalizeFirst(link.key || 'Link');
                const url = link.url || '#';
                return `
                    <div class="contact-method">
                        <i class="${iconClass}"></i>
                        <div>
                            <h4>${title}</h4>
                            <p><a href="${url}" target="${url.startsWith('mailto:') ? '_self' : '_blank'}">${this.formatLinkText(url, title)}</a></p>
                        </div>
                    </div>
                `;
            })
            .join('');
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    formatLinkText(url, title) {
        // Format URL display text based on platform
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname.replace('www.', '');
            
            if (url.includes('linkedin.com')) {
                return domain + urlObj.pathname;
            } else if (url.includes('github.com')) {
                return domain + urlObj.pathname;
            } else if (url.includes('instagram.com')) {
                return '@' + urlObj.pathname.replace('/', '');
            } else if (url.includes('twitter.com')) {
                return '@' + urlObj.pathname.replace('/', '');
            } else {
                return domain;
            }
        } catch (e) {
            return url;
        }
    }

    // Typing animation function
    typeWriter(element, text, speed = 60) {
        let i = 0;
        element.innerHTML = '';
        
        function type() {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                setTimeout(type, speed);
            }
        }
        
        type();
    }

    // Blog modal functionality
    openBlogModal(postId) {
        const post = this.content.blog.find(p => p.id === postId);
        if (!post) return;

        const modal = document.getElementById('blog-modal');
        const modalTitle = modal.querySelector('.blog-modal-title');
        const modalDate = modal.querySelector('.blog-modal-date');
        const modalAuthor = modal.querySelector('.blog-modal-author');
        const modalImages = modal.querySelector('.blog-modal-images');
        const modalContent = modal.querySelector('.blog-modal-content-text');
        const modalTags = modal.querySelector('.blog-modal-tags');
        const modalLinks = modal.querySelector('.blog-modal-links');

        // Format date
        const publishDate = new Date(post.publishDate);
        const formattedDate = publishDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        // Populate modal content
        modalTitle.textContent = post.title;
        modalDate.textContent = formattedDate;
        modalAuthor.textContent = `by ${post.author}`;
        
        // Images
        if (post.images && post.images.length > 0) {
            modalImages.innerHTML = post.images.map(img => `
                <div class="blog-modal-image">
                    <img src="${img.url}" alt="${img.alt || post.title}" loading="lazy">
                    ${img.caption ? `<p class="image-caption">${img.caption}</p>` : ''}
                </div>
            `).join('');
        } else {
            modalImages.innerHTML = '';
        }

        // Content
        modalContent.innerHTML = post.content;

        // Tags
        if (post.tags && post.tags.length > 0) {
            modalTags.innerHTML = `
                <div class="blog-modal-tags-container">
                    <h4>Tags:</h4>
                    <div class="blog-modal-tags-list">
                        ${post.tags.map(tag => `<span class="blog-tag">${tag}</span>`).join('')}
                    </div>
                </div>
            `;
        } else {
            modalTags.innerHTML = '';
        }

        // Links
        if (post.links && post.links.length > 0) {
            modalLinks.innerHTML = `
                <div class="blog-modal-links-container">
                    <h4>Related Links:</h4>
                    <div class="blog-modal-links-list">
                        ${post.links.map(link => `
                            <a href="${link.url}" class="blog-link" target="_blank" rel="noopener noreferrer">
                                <i class="fas fa-external-link-alt"></i> ${link.text}
                            </a>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            modalLinks.innerHTML = '';
        }

        // Show modal
        modal.classList.add('active');
        document.body.classList.add('modal-open');
    }

    closeBlogModal() {
        const modal = document.getElementById('blog-modal');
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
    }
}

// Initialize content manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (!window.contentManager) {
        window.contentManager = new ContentManager();
    }
});
