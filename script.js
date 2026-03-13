// --- PERSISTÊNCIA DE DADOS ---
function saveToLocalStorage() {
    const dataToSave = {
        incomeValue: incomeValue,
        transactions: transactions,
        userData: userData
    };
    localStorage.setItem('financeFlowData', JSON.stringify(dataToSave));
}

function loadFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('financeFlowData');
        if (savedData) {
            const parsed = JSON.parse(savedData);
            
            // Só substitui se o dado existir no storage
            if (parsed.incomeValue !== undefined) incomeValue = parsed.incomeValue;
            if (parsed.transactions) transactions = parsed.transactions;
            if (parsed.userData) {
                // Mescla os dados do usuário para não perder campos novos no futuro
                userData = { ...userData, ...parsed.userData };
            }
            return true;
        }
    } catch (e) {
        console.error("Erro ao carregar dados:", e);
    }
    return false;
}

// Dados Iniciais (Exemplos)
let incomeValue = 5063.00;
let transactions = [
    { id: 1, desc: 'Aluguel & Condomínio', category: 'Moradia', value: 1500.00, date: '2024-03-01', status: 'pago' },
    { id: 2, desc: 'Compras Supermercado', category: 'Alimentação', value: 850.50, date: '2024-03-05', status: 'pago' },
    { id: 3, desc: 'Assinatura Netflix', category: 'Lazer', value: 55.90, date: '2024-03-10', status: 'pago' },
    { id: 4, desc: 'Conta de Luz', category: 'Moradia', value: 220.00, date: '2024-03-12', status: 'pendente' },
    { id: 5, desc: 'Posto de Gasolina', category: 'Transporte', value: 300.00, date: '2024-03-14', status: 'pago' },
    { id: 6, desc: 'Farmácia', category: 'Saúde', value: 125.00, date: '2024-03-15', status: 'pago' },
    { id: 7, desc: 'Restaurante Jantar', category: 'Lazer', value: 198.60, date: '2024-03-18', status: 'pago' }
];

let userData = {
    name: 'Seu Nome',
    avatar: 'U'
};

// Variáveis de Estado
let editingTransactionId = null;

// Elementos do DOM
const tbody = document.getElementById('transaction-tbody');
const totalIncomeEl = document.getElementById('total-income');
const totalExpensesEl = document.getElementById('total-expenses');
const remainingBalanceEl = document.getElementById('remaining-balance');
const progressBar = document.querySelector('.progress');
const incomeCard = document.querySelector('.balance-card');
const userDisplayName = document.getElementById('user-display-name');
const userAvatar = document.getElementById('user-avatar');

// Funções de Perfil
const profileModal = document.getElementById('profile-modal');
const inputNewName = document.getElementById('new-user-name');
const photoInput = document.getElementById('user-photo-input');
const modalPreview = document.getElementById('modal-avatar-preview');
const triggerBtn = document.getElementById('trigger-photo-upload');

function updateAvatarUI(avatarEl, data) {
    if (!avatarEl) return;
    if (data.photo) {
        avatarEl.style.backgroundImage = `url(${data.photo})`;
        avatarEl.innerText = '';
    } else {
        avatarEl.style.backgroundImage = 'none';
        avatarEl.innerText = data.name.charAt(0).toUpperCase();
    }
}

function updateProfileUI() {
    if(userDisplayName) userDisplayName.innerText = userData.name;
    updateAvatarUI(userAvatar, userData);
    updateAvatarUI(modalPreview, userData);
}

document.getElementById('user-profile-btn').onclick = () => {
    inputNewName.value = userData.name;
    updateAvatarUI(modalPreview, userData);
    profileModal.classList.add('active');
};

// Logica de Troca de Foto
[modalPreview, triggerBtn].forEach(el => {
    el.onclick = () => photoInput.click();
});

photoInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target.result;
            // Preview temporário no modal
            modalPreview.style.backgroundImage = `url(${base64})`;
            modalPreview.innerText = '';
            // Guardamos no objeto para salvar depois
            userData.tempPhoto = base64;
        };
        reader.readAsDataURL(file);
    }
};

document.getElementById('close-profile-modal').onclick = () => {
    delete userData.tempPhoto; // Cancela alteração de foto
    profileModal.classList.remove('active');
};

document.getElementById('save-profile-name').onclick = () => {
    const newName = inputNewName.value;
    if (newName && newName.trim().length > 0) {
        userData.name = newName.trim();
        // Se houver uma nova foto temporária, ela vira a oficial
        if (userData.tempPhoto) {
            userData.photo = userData.tempPhoto;
            delete userData.tempPhoto;
        }
        updateProfileUI();
        saveToLocalStorage();
        profileModal.classList.remove('active');
    } else {
        alert("Por favor, digite um nome válido.");
    }
};

// Sistema de Navegação (Tabs)
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const targetTab = item.getAttribute('data-tab');
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        tabContents.forEach(tab => {
            tab.classList.remove('active');
            if (tab.id === `tab-${targetTab}`) tab.classList.add('active');
        });
    });
});

// Notificações
const notifDrawer = document.getElementById('notification-drawer');
const closeNotifBtn = document.getElementById('close-notif');

document.getElementById('notif-btn').onclick = (e) => {
    e.stopPropagation();
    notifDrawer.classList.add('active');
    const dot = document.querySelector('.notification-icon .dot');
    if (dot) dot.style.display = 'none';
};

closeNotifBtn.onclick = () => notifDrawer.classList.remove('active');

window.addEventListener('click', (e) => {
    if (notifDrawer.classList.contains('active') && !notifDrawer.contains(e.target)) {
        notifDrawer.classList.remove('active');
    }
});

// Editar renda
incomeCard.addEventListener('click', () => {
    const newVal = prompt("Digite o novo valor do seu Dinheiro Disponível (R$):", incomeValue);
    if (newVal !== null && !isNaN(parseFloat(newVal))) {
        incomeValue = parseFloat(newVal);
        updateUI();
        saveToLocalStorage(); // Salva alteração de renda
    }
});

// Gráficos
let mainChart, categoryChart;

function initCharts() {
    const ctxMain = document.getElementById('mainFinanceChart').getContext('2d');
    const ctxPie = document.getElementById('categoryChart').getContext('2d');

    mainChart = new Chart(ctxMain, {
        type: 'bar',
        data: {
            labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
            datasets: [{
                label: 'Gastos (R$)',
                data: [1800, 1200, 950, 400],
                backgroundColor: '#6366f1',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });

    categoryChart = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: ['Moradia', 'Alimentação', 'Transporte', 'Lazer', 'Outros'],
            datasets: [{
                data: [0, 0, 0, 0, 0],
                backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 20, usePointStyle: true } }
            },
            cutout: '70%'
        }
    });
}

function updateUI() {
    tbody.innerHTML = '';
    let totalSpent = 0;
    const categoryTotals = {};

    transactions.forEach(t => {
        totalSpent += t.value;
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.value;

        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.onclick = (e) => {
            if (e.target.closest('.btn-delete')) return;
            openEditModal(t.id);
        };

        row.innerHTML = `
            <td><strong>${t.desc}</strong></td>
            <td><span class="category-tag">${t.category}</span></td>
            <td>${new Date(t.date).toLocaleDateString('pt-BR')}</td>
            <td>R$ ${t.value.toFixed(2)}</td>
            <td><span class="status-badge status-${t.status}">${t.status === 'pago' ? 'Pago' : 'Pendente'}</span></td>
            <td>
                <button class="btn-delete" onclick="deleteTransaction(${t.id})">
                    <i data-lucide="trash-2" style="width: 18px"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    lucide.createIcons();

    const remaining = incomeValue - totalSpent;
    const percentUsed = (totalSpent / incomeValue) * 100;

    totalIncomeEl.innerText = `R$ ${incomeValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    totalExpensesEl.innerText = `R$ ${totalSpent.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    remainingBalanceEl.innerText = `R$ ${remaining.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    
    progressBar.style.width = `${Math.min(percentUsed, 100)}%`;
    if(percentUsed > 80) progressBar.style.background = 'var(--danger-color)';
    else progressBar.style.background = 'linear-gradient(90deg, var(--accent-color), #818cf8)';

    if(categoryChart) {
        categoryChart.data.datasets[0].data = [
            categoryTotals['Moradia'] || 0,
            categoryTotals['Alimentação'] || 0,
            categoryTotals['Transporte'] || 0,
            categoryTotals['Lazer'] || 0,
            categoryTotals['Outros'] || 0
        ];
        categoryChart.update();
    }
}

// Modal
const modal = document.getElementById('expense-modal');
const modalTitle = modal.querySelector('h3');

function openEditModal(id = null) {
    editingTransactionId = id;
    if (id) {
        const t = transactions.find(item => item.id === id);
        document.getElementById('desc').value = t.desc;
        document.getElementById('category').value = t.category;
        document.getElementById('value').value = t.value;
        modalTitle.innerText = "Editar Gasto";
    } else {
        document.getElementById('expense-form').reset();
        modalTitle.innerText = "Adicionar Novo Gasto";
    }
    modal.classList.add('active');
}

document.getElementById('open-modal').onclick = () => openEditModal();
document.getElementById('close-modal').onclick = () => modal.classList.remove('active');

function deleteTransaction(id) {
    if(confirm("Deseja realmente excluir este gasto?")) {
        transactions = transactions.filter(t => t.id !== id);
        updateUI();
        saveToLocalStorage(); // Salva após deletar
    }
}

// Envio Form
document.getElementById('expense-form').onsubmit = (e) => {
    e.preventDefault();
    const desc = document.getElementById('desc').value;
    const category = document.getElementById('category').value;
    const value = parseFloat(document.getElementById('value').value);
    
    if (editingTransactionId) {
        const index = transactions.findIndex(t => t.id === editingTransactionId);
        transactions[index] = { ...transactions[index], desc, category, value };
    } else {
        const newId = Date.now(); // ID mais seguro
        transactions.push({
            id: newId, desc, category, value,
            date: new Date().toISOString().split('T')[0], status: 'pago'
        });
    }

    updateUI();
    saveToLocalStorage(); // Salva após adicionar/editar
    modal.classList.remove('active');
    editingTransactionId = null;
    e.target.reset();
};

// Start
window.onload = () => {
    loadFromLocalStorage(); // Tenta carregar dados salvos
    initCharts();
    updateUI();
    updateProfileUI();
    
    const date = new Date();
    const month = date.toLocaleString('pt-BR', { month: 'long' });
    const year = date.getFullYear();
    document.getElementById('current-date').innerText = `${month.charAt(0).toUpperCase() + month.slice(1)} de ${year}`;
};
