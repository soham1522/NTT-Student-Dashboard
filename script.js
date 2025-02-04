class Dashboard {
    constructor() {
        this.data = [];
        this.filteredData = [];
        this.charts = {};
        this.init();
    }

    init() {
        // Setup file upload
        const uploadButton = document.getElementById('uploadButton');
        const fileInput = document.getElementById('fileUpload');

        uploadButton.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFileUpload(e));

        // Setup filters
        document.getElementById('stateFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('schoolTypeFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('minMarks').addEventListener('input', () => this.applyFilters());
        document.getElementById('maxMarks').addEventListener('input', () => this.applyFilters());
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.processData(e.target.result);
                document.getElementById('dashboard').classList.remove('hidden');
                Swal.fire({
                    icon: 'success',
                    title: 'Data loaded successfully',
                    timer: 1500
                });
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error loading data',
                    text: error.message
                });
            }
        };
        reader.readAsText(file);
    }

    processData(csv) {
        // Parse CSV
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        this.data = lines.slice(1)
            .filter(line => line.trim())
            .map(line => {
                const values = line.split(',');
                return headers.reduce((obj, header, index) => {
                    obj[header] = isNaN(values[index]) ? values[index].trim() : parseFloat(values[index]);
                    return obj;
                }, {});
            });

        this.filteredData = [...this.data];
        this.setupFilters();
        this.updateDashboard();
    }

    setupFilters() {
        // Populate state filter
        const states = [...new Set(this.data.map(d => d.State))];
        const stateFilter = document.getElementById('stateFilter');
        stateFilter.innerHTML = '<option value="">All States</option>' + 
            states.map(state => `<option value="${state}">${state}</option>`).join('');

        // Populate school type filter
        const types = [...new Set(this.data.map(d => d.school_type))];
        const typeFilter = document.getElementById('schoolTypeFilter');
        typeFilter.innerHTML = '<option value="">All Types</option>' + 
            types.map(type => `<option value="${type}">${type}</option>`).join('');
    }

    applyFilters() {
        const state = document.getElementById('stateFilter').value;
        const type = document.getElementById('schoolTypeFilter').value;
        const min = parseFloat(document.getElementById('minMarks').value) || 0;
        const max = parseFloat(document.getElementById('maxMarks').value) || 100;

        this.filteredData = this.data.filter(d => 
            (!state || d.State === state) &&
            (!type || d.school_type === type) &&
            d.Avg_marks >= min &&
            d.Avg_marks <= max
        );

        this.updateDashboard();
    }

    updateDashboard() {
        this.updateMetrics();
        this.updateCharts();
        this.updateTable();
    }

    updateMetrics() {
        const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
        
        document.getElementById('avgMarks').textContent = 
            avg(this.filteredData.map(d => d.Avg_marks)).toFixed(2);
        
        document.getElementById('passPercentage').textContent = 
            avg(this.filteredData.map(d => d.pass_percentage)).toFixed(2) + '%';
        
        document.getElementById('avgAttendance').textContent = 
            avg(this.filteredData.map(d => d.Average_attendance)).toFixed(2) + '%';
    }

    updateCharts() {
        this.updateSchoolTypeChart();
        this.updateAttendanceChart();
    }

    updateSchoolTypeChart() {
        const ctx = document.getElementById('schoolTypeChart').getContext('2d');
        
        if (this.charts.schoolType) {
            this.charts.schoolType.destroy();
        }

        // Prepare data
        const schoolTypes = [...new Set(this.filteredData.map(d => d.school_type))];
        const avgMarks = schoolTypes.map(type => {
            const schools = this.filteredData.filter(d => d.school_type === type);
            return schools.reduce((sum, school) => sum + school.Avg_marks, 0) / schools.length;
        });

        // Create chart
        this.charts.schoolType = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: schoolTypes,
                datasets: [{
                    label: 'Average Marks',
                    data: avgMarks,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    updateAttendanceChart() {
        const schoolTypes = [...new Set(this.filteredData.map(d => d.school_type))];
        const series = schoolTypes.map(type => {
            const schools = this.filteredData.filter(d => d.school_type === type);
            const attendance = schools.map(s => s.Average_attendance);
            return {
                name: type,
                data: [
                    Math.min(...attendance),
                    attendance.reduce((a, b) => a + b) / attendance.length,
                    Math.max(...attendance)
                ]
            };
        });

        Highcharts.chart('attendanceChart', {
            chart: { type: 'column' },
            title: { text: 'Attendance Distribution' },
            xAxis: { categories: ['Minimum', 'Average', 'Maximum'] },
            yAxis: {
                title: { text: 'Attendance (%)' },
                min: 0,
                max: 100
            },
            series: series
        });
    }
    

    updateTable() {
        const tbody = document.getElementById('dataTableBody');
        tbody.innerHTML = this.filteredData.map(row => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">${row.State}</td>
                <td class="px-6 py-4 whitespace-nowrap">${row.school_type}</td>
                <td class="px-6 py-4 whitespace-nowrap">${row.Avg_marks.toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap">${row.pass_percentage.toFixed(2)}%</td>
                <td class="px-6 py-4 whitespace-nowrap">${row.Average_attendance.toFixed(2)}%</td>
            </tr>
        `).join('');
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});