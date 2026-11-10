/**
 * CSV Exporter for Job Aggregator & Walk-in Dashboard.
 * Exports tracked, applied, or all filtered jobs.
 */

import { tracker } from './tracker.js';

export function exportJobsToCSV(jobsList, filename = null) {
  if (!jobsList || jobsList.length === 0) {
    alert('No job listings available to export.');
    return;
  }

  const headers = [
    'Job ID',
    'Application Status',
    'Company Name',
    'Job Title',
    'Category',
    'Location',
    'Work Mode',
    'Batch Eligibility',
    'Experience',
    'Salary Range',
    'ATS / Apply Link',
    'Walk-in Drive Date',
    'Walk-in Venue Address',
    'HR Contact Person',
    'HR Contact Email',
    'Post Date',
    'Discovered At'
  ];

  const escapeCSV = (field) => {
    if (field === null || field === undefined) return '""';
    const stringField = String(field);
    return `"${stringField.replace(/"/g, '""')}"`;
  };

  const rows = jobsList.map(job => {
    const status = tracker.getStatus(job.id, job.user_status || 'Not Applied');
    const walkin = job.walkin_details || {};

    return [
      job.id,
      status,
      job.company_name,
      job.job_title,
      job.category_name,
      job.location,
      job.work_mode,
      job.batch,
      job.experience,
      job.salary_range || 'N/A',
      job.apply_url,
      walkin.drive_date || 'N/A',
      walkin.venue_address || 'N/A',
      walkin.contact_person || 'N/A',
      walkin.contact_email || 'N/A',
      job.post_date,
      job.first_discovered_at || 'N/A'
    ].map(escapeCSV).join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  const defaultFilename = filename || `fresher_job_tracker_${dateStr}.csv`;
  
  if (navigator.msSaveBlob) {
    navigator.msSaveBlob(blob, defaultFilename);
  } else {
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', defaultFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
