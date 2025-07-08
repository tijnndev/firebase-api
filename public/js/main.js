document.addEventListener('DOMContentLoaded', function() {
  // Check for dark mode preference
  const darkMode = localStorage.getItem('darkMode') === 'true';

  if (darkMode) {
    document.body.classList.remove('light-mode');
  } else {
    document.body.classList.add('light-mode');
  }

  // Theme toggler
  const themeToggler = document.getElementById('theme-toggler');
  if (themeToggler) {
    themeToggler.addEventListener('click', function() {
      document.body.classList.toggle('light-mode');
      const isDarkMode = !document.body.classList.contains('light-mode');

      localStorage.setItem('darkMode', isDarkMode);
      
      // Store theme preference
      fetch('/toggle-theme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ darkMode: isDarkMode }),
      });
    });
  }
  
  // Mobile sidebar toggle
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  const contentWrapper = document.querySelector('.content-wrapper');
  
  if (sidebarToggle && sidebar && contentWrapper) {
    sidebarToggle.addEventListener('click', function() {
      sidebar.classList.toggle('show');
      // contentWrapper.classList.toggle('sidebar-open');
    });
  }
  
  // Search/filter functionality for services
  const searchInput = document.getElementById('search-services');
  const serviceCards = document.querySelectorAll('.service-card');
  
  if (searchInput && serviceCards.length > 0) {
    searchInput.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase().trim();
      
      serviceCards.forEach(card => {
        const serviceName = card.querySelector('.service-name').textContent.toLowerCase();
        const serviceUrl = card.querySelector('.service-url').textContent.toLowerCase();
        
        if (serviceName.includes(searchTerm) || serviceUrl.includes(searchTerm)) {
          card.classList.remove('d-none');
        } else {
          card.classList.add('d-none');
        }
      });
      
      // Check if no results are found
      const visibleCards = document.querySelectorAll('.service-card:not(.d-none)');
      const noResultsMessage = document.getElementById('no-results-message');
      
      if (noResultsMessage) {
        if (visibleCards.length === 0 && searchTerm.length > 0) {
          noResultsMessage.classList.remove('d-none');
        } else {
          noResultsMessage.classList.add('d-none');
        }
      }
    });
  }
  
  // Notification test functionality
  const notificationForm = document.getElementById('notification-test-form');
  
  if (notificationForm) {
    notificationForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const serviceId = this.querySelector('[name="serviceId"]').value;
      const title = this.querySelector('[name="title"]').value;
      const body = this.querySelector('[name="body"]').value;
      const secret = this.querySelector('[name="secret"]').value;
      
      if (!serviceId || !title || !body || !secret) {
        alert('Please fill out all fields');
        return;
      }
      
      // Show loading state
      const submitBtn = this.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';
      
      // Send notification
      fetch('/services/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serviceId, title, body, secret }),
      })
        .then(response => response.json())
        .then(data => {
          console.log(data)
          // Reset form and show success message
          if (data.message) {
            const alertBox = document.createElement('div');
            alertBox.className = 'alert alert-success alert-dismissible fade show mt-3';
            alertBox.innerHTML = `
              ${data.message}
              <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            notificationForm.after(alertBox);
            
            // Auto-dismiss after 5 seconds
            setTimeout(() => {
              alertBox.classList.remove('show');
              setTimeout(() => alertBox.remove(), 300);
            }, 5000);
          }
        })
        .catch(error => {
          console.error('Error sending notification:', error);
          const alertBox = document.createElement('div');
          alertBox.className = 'alert alert-danger alert-dismissible fade show mt-3';
          alertBox.innerHTML = `
            Error sending notification: ${error.message || 'Unknown error'}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
          `;
          notificationForm.after(alertBox);
        })
        .finally(() => {
          // Restore button state
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        });
    });
  }
  
  // Delete confirmation
  const deleteButtons = document.querySelectorAll('.btn-delete');
  
  if (deleteButtons.length > 0) {
    deleteButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
          e.preventDefault();
        }
      });
    });
  }
  
  // Copy secret to clipboard
  const copyButtons = document.querySelectorAll('.btn-copy-secret');
  
  if (copyButtons.length > 0) {
    copyButtons.forEach(button => {
      button.addEventListener('click', function() {
        const secret = this.getAttribute('data-secret');
        navigator.clipboard.writeText(secret)
          .then(() => {
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
              this.innerHTML = originalText;
            }, 2000);
          })
          .catch(err => {
            console.error('Failed to copy text: ', err);
          });
      });
    });
  }

  const logSearchInput = document.getElementById("logSearch");
  const logTypeFilter = document.getElementById("logTypeFilter");
  const logEntries = document.querySelectorAll(".log-entry");

  function filterLogs() {
    const searchTerm = logSearchInput.value.toLowerCase();
    const selectedType = logTypeFilter.value;

    logEntries.forEach((row) => {
      const type = row.getAttribute("data-type");
      const message = row.querySelector(".log-message").textContent.toLowerCase();

      const matchesType = !selectedType || type === selectedType;
      const matchesSearch = message.includes(searchTerm);

      row.style.display = matchesType && matchesSearch ? "" : "none";
    });
  }

  logSearchInput.addEventListener("input", filterLogs);
  logTypeFilter.addEventListener("change", filterLogs);
});
