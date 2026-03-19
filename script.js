// --- PERSISTÊNCIA DE DADOS ---
function saveToLocalStorage() {
    try {
        const dataToSave = {
            incomeValue: incomeValue,
            transactions: transactions,
            userData: userData
        };
        localStorage.setItem('financeFlowData', JSON.stringify(dataToSave));
    } catch (e) {
        console.error("Erro ao salvar dados:", e);
        if (e.name === 'QuotaExceededError') {
            alert("A foto de perfil é muito pesada e não pôde ser salva. Tente uma foto menor ou com menos qualidade.");
        }
    }
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
        // Validar tamanho (opcional, mas bom ter)
        if (file.size > 5 * 1024 * 1024) {
            alert("A imagem é muito grande. Escolha uma foto menor que 5MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // Criar um canvas para redimensionar/comprimir
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400; // Tamanho ideal para avatar
                const MAX_HEIGHT = 400;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Converter para Base64 com qualidade reduzida
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                
                // Preview temporário no modal
                modalPreview.style.backgroundImage = `url(${compressedBase64})`;
                modalPreview.innerText = '';
                // Guardamos no objeto para salvar depois
                userData.tempPhoto = compressedBase64;
            };
            img.src = event.target.result;
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

// --- SIDEBAR COLLAPSE ---
const sidebar = document.querySelector('.sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');

// Iniciar colapsada como solicitado
sidebar.classList.add('collapsed');

sidebarToggle.addEventListener('click', (e) => {
    e.stopPropagation(); // Impede que o clique no botão ative o clique da sidebar
    sidebar.classList.toggle('collapsed');
});

// Se clicar na sidebar enquanto colapsada, ela se revela
sidebar.addEventListener('click', () => {
    if (sidebar.classList.contains('collapsed')) {
        sidebar.classList.remove('collapsed');
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
let mainChart, categoryChart, daysOfWeekChart;

function initCharts() {
    const ctxMain = document.getElementById('mainFinanceChart').getContext('2d');
    const ctxPie = document.getElementById('categoryChart').getContext('2d');
    const ctxDays = document.getElementById('daysOfWeekChart').getContext('2d');

    mainChart = new Chart(ctxMain, {
        type: 'bar',
        data: {
            labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
            datasets: [{
                label: 'Gastos (R$)',
                data: [1200, 950, 1800, 400],
                backgroundColor: '#6366f1',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#f8fafc',
                    bodyColor: '#f8fafc',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false
                }
            },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });

    daysOfWeekChart = new Chart(ctxDays, {
        type: 'bar',
        data: {
            labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
            datasets: [{
                label: 'Gastos (R$)',
                data: [150, 200, 180, 220, 300, 450, 120],
                backgroundColor: [
                    '#6366f1', // Segunda (Azul)
                    '#10b981', // Terça (Verde)
                    '#f59e0b', // Quarta (Laranja)
                    '#f43f5e', // Quinta (Rosa)
                    '#8b5cf6', // Sexta (Roxo)
                    '#06b6d4', // Sábado (Ciano)
                    '#ec4899'  // Domingo (Magenta)
                ],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#f8fafc',
                    bodyColor: '#f8fafc',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false
                }
            },
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
    const stBody = document.getElementById('statement-tbody');
    if(stBody) stBody.innerHTML = '';
    
    let totalSpent = 0;
    let totalPendingValue = 0;
    const categoryTotals = {};

    // Ordena por data
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    transactions.forEach(t => {
        totalSpent += t.value;
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.value;

        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        
        row.innerHTML = `
            <td><strong>${t.desc}</strong></td>
            <td><span class="category-tag">${t.category}</span></td>
            <td>${new Date(t.date).toLocaleDateString('pt-BR')}</td>
            <td>R$ ${t.value.toFixed(2)}</td>
            <td><span class="status-badge status-${t.status}">${t.status === 'pago' ? 'Pago' : 'Pendente'}</span></td>
            <td>
                <button class="btn-delete" title="Excluir Gasto">
                    <i data-lucide="trash-2" style="width: 18px"></i>
                </button>
            </td>
        `;

        // Evento para abrir edição (na linha toda)
        row.addEventListener('click', () => {
            openEditModal(t.id);
        });

        // Evento para excluir (específico no botão)
        const deleteBtn = row.querySelector('.btn-delete');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // IMPORTANTE: Impede que a linha (row) receba o clique e abra o modal de editar
            deleteTransaction(t.id);
        });

        tbody.appendChild(row);

        // Abastece a tabela "Contas a Pagar"
        if (t.status === 'pendente') {
            totalPendingValue += t.value;
            if (stBody) {
                const stRow = document.createElement('tr');
                stRow.style.cursor = 'pointer';
                stRow.innerHTML = `
                    <td><strong>${t.desc}</strong></td>
                    <td><span class="category-tag">${t.category}</span></td>
                    <td>${new Date(t.date).toLocaleDateString('pt-BR')}</td>
                    <td>R$ ${t.value.toFixed(2)}</td>
                    <td><span class="status-badge status-pending">Pendente</span></td>
                    <td>
                        <button class="btn-delete" title="Excluir Gasto">
                            <i data-lucide="trash-2" style="width: 18px"></i>
                        </button>
                    </td>
                `;
                stRow.addEventListener('click', () => openEditModal(t.id));
                const stDel = stRow.querySelector('.btn-delete');
                stDel.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteTransaction(t.id);
                });
                stBody.appendChild(stRow);
            }
        }
    });

    const totalPendingHeader = document.getElementById('total-pending-header');
    if(totalPendingHeader) {
        totalPendingHeader.innerText = `R$ ${totalPendingValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    }

    // Calcula Totais Mensais para a Aba de Parcelas
    const monthlyTotals = {};
    transactions.forEach(t => {
        if (t.status === 'pendente') {
            const monthYear = new Date(t.date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            monthlyTotals[monthYear] = (monthlyTotals[monthYear] || 0) + t.value;
        }
    });

    const projectionContainer = document.getElementById('monthly-projection');
    if (projectionContainer) {
        projectionContainer.innerHTML = '';
        Object.entries(monthlyTotals).forEach(([month, total]) => {
            const item = document.createElement('div');
            item.style.cssText = "background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 12px; border: 1px solid var(--glass-border); min-width: 150px;";
            item.innerHTML = `
                <p style="color: var(--text-secondary); font-size: 0.8rem; margin-bottom: 5px;">${month}</p>
                <h4 style="font-size: 1.1rem; color: #f59e0b;">R$ ${total.toFixed(2)}</h4>
            `;
            projectionContainer.appendChild(item);
        });
    }

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
        const dueDateInput = document.getElementById('due-date');
        if (dueDateInput) dueDateInput.value = t.date;
        const statusInput = document.getElementById('status');
        if (statusInput) statusInput.value = t.status || 'pendente';
        const instInput = document.getElementById('installments');
        if (instInput) {
            instInput.value = 1;
            instInput.disabled = true; // Desabilita parcelas na edição
        }
        modalTitle.innerText = "Editar Gasto";
    } else {
        document.getElementById('expense-form').reset();
        const dueDateInput = document.getElementById('due-date');
        // Define data default
        const todayStr = new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD'
        if (dueDateInput) dueDateInput.value = todayStr;
        const instInput = document.getElementById('installments');
        if (instInput) instInput.disabled = false;
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
    const dateInput = document.getElementById('due-date');
    const date = dateInput ? dateInput.value : new Date().toLocaleDateString('en-CA');
    const statusInput = document.getElementById('status');
    const status = statusInput ? statusInput.value : 'pago';
    const billTypeInput = document.getElementById('bill-type');
    const billType = billTypeInput ? billTypeInput.value : 'split';
    const instInput = document.getElementById('installments');
    const installments = instInput ? (parseInt(instInput.value) || 1) : 1;
    
    if (editingTransactionId) {
        const index = transactions.findIndex(t => t.id === editingTransactionId);
        transactions[index] = { ...transactions[index], desc, category, value, date, status };
    } else {
        const baseId = Date.now();
        const installmentValue = (billType === 'split') ? (value / installments) : value;
        
        for (let i = 0; i < installments; i++) {
            // Fuso horário corrigido para pular meses de forma segura
            const d = new Date(date + "T12:00:00Z");
            d.setUTCMonth(d.getUTCMonth() + i);
            const instDate = d.toISOString().split('T')[0];
            
            const instDesc = installments > 1 ? `${desc} (${i + 1}/${installments})` : desc;
            
            transactions.push({
                id: baseId + i, 
                desc: instDesc, 
                category, 
                value: installmentValue,
                date: instDate, 
                status: (i === 0) ? status : 'pendente' // Apenas a 1ª parcela herda o status escolhido, as demais são pendentes
            });
        }
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

// --- ESTRATÉGIA IA ---
if (btnGenerateAI) {
    btnGenerateAI.addEventListener('click', () => {
        aiResponseContainer.style.display = 'flex';
        aiResponseText.innerHTML = '';
        aiTypingIndicator.style.display = 'flex';
        btnGenerateAI.disabled = true;
        btnGenerateAI.style.opacity = '0.6';
        btnGenerateAI.innerHTML = `<i data-lucide="loader" class="spin-icon"></i> Processando Consultoria...`;
        lucide.createIcons();

        // --- CÁLCULOS TÉCNICOS ---
        const totalExpenses = transactions.reduce((acc, t) => acc + t.value, 0);
        const pendingTransactions = transactions.filter(t => t.status === 'pendente');
        const pendingSum = pendingTransactions.reduce((acc, t) => acc + t.value, 0);
        const paidSum = transactions.filter(t => t.status === 'pago').reduce((acc, t) => acc + t.value, 0);
        const balance = incomeValue - totalExpenses;
        const savingsRate = (balance > 0) ? (balance / incomeValue) * 100 : 0;

        // Categorias e Gastos Desnecessários (Ex: Lazer > 20% da renda)
        const catTotals = {};
        transactions.forEach(t => catTotals[t.category] = (catTotals[t.category] || 0) + t.value);
        const leisureSpending = catTotals['Lazer'] || 0;
        const isLeisureHigh = leisureSpending > (incomeValue * 0.15);

        // Simulação de Juros de Dívida (Atraso médio 10% am no Brasil para cartões/cheque especial)
        const estimatedInterest = pendingSum * 0.107; 

        setTimeout(() => {
            aiTypingIndicator.style.display = 'none';
            btnGenerateAI.disabled = false;
            btnGenerateAI.style.opacity = '1';
            btnGenerateAI.innerHTML = `<i data-lucide="sparkles"></i> Gerar Novo Diagnóstico`;

            const first = userData.name.split(' ')[0];
            
            // CONSTRUÇÃO DO DASHBOARD DE CONSULTORIA
            let html = `
                <!-- CARD 1: DIAGNÓSTICO DE SAÚDE -->
                <div class="card" style="background: rgba(15, 23, 42, 0.8); border: 1px solid var(--glass-border); padding: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
                        <div>
                            <h4 style="color: var(--accent-color); font-size: 1.1rem; margin-bottom: 5px;">Diagnóstico de Saúde Atual</h4>
                            <p style="color: var(--text-secondary); font-size: 0.85rem;">Análise baseada no seu salário de R$ ${incomeValue.toFixed(2)}</p>
                        </div>
                        <span style="padding: 5px 12px; border-radius: 20px; font-size: 0.75rem; background: ${balance > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)'}; color: ${balance > 0 ? 'var(--success-color)' : 'var(--danger-color)'}; border: 1px solid currentColor;">
                            ${balance > 0 ? 'Perfil Superavitário' : 'Perfil Deficitário'}
                        </span>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                        <div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 12px;">
                            <p style="font-size: 0.75rem; color: var(--text-secondary);">Taxa de Poupança</p>
                            <h5 style="font-size: 1.1rem; color: ${savingsRate >= 20 ? 'var(--success-color)' : '#f59e0b'}">${savingsRate.toFixed(1)}%</h5>
                        </div>
                        <div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 12px;">
                            <p style="font-size: 0.75rem; color: var(--text-secondary);">Risco de Juros (Est.)</p>
                            <h5 style="font-size: 1.1rem; color: var(--danger-color);">R$ ${estimatedInterest.toFixed(2)}</h5>
                        </div>
                    </div>

                    <div style="border-top: 1px solid var(--glass-border); padding-top: 1rem;">
                        <h5 style="font-size: 0.9rem; margin-bottom: 10px; color: white;">Identificação de Gastos Desnecessários:</h5>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">
                            ${isLeisureHigh ? `⚠️ <strong>Alerta de Lazer:</strong> Seus gastos com entretenimento (R$ ${leisureSpending.toFixed(2)}) estão consumindo ${((leisureSpending/incomeValue)*100).toFixed(1)}% da sua renda. Reduzir 30% desse valor liberaria R$ ${(leisureSpending*0.3).toFixed(2)} mensais para sua liberdade.` : `✅ Seus gastos fixos e variáveis estão equilibrados dentro das categorias principais.`}
                        </p>
                    </div>
                </div>

                <!-- CARD 2: ESTRATÉGIA PARA DÍVIDAS -->
                <div class="card" style="background: rgba(15, 23, 42, 0.8); border: 1px solid var(--glass-border); padding: 1.5rem;">
                    <h4 style="color: #f43f5e; font-size: 1.1rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="shield-alert" style="width: 20px;"></i> Estratégia de Quitação
                    </h4>
                    
                    <div style="display: flex; flex-direction: column; gap: 1rem; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6;">
                        <div style="background: rgba(244, 63, 94, 0.05); border-left: 4px solid #f43f5e; padding: 1rem; border-radius: 0 8px 8px 0;">
                            <strong>Método Avalanche (Recomendado):</strong> Foque todo o seu saldo restante (R$ ${Math.max(0, balance).toFixed(2)}) no pagamento da dívida de maior valor ou juros primeiro. 
                            Atualmente, priorize: <strong>"${pendingTransactions.length > 0 ? pendingTransactions.sort((a,b) => b.value - a.value)[0].desc : 'Nenhuma'}"</strong>.
                        </div>
                        <p><strong>Dica Extra:</strong> Tente renegociar dívidas que ultrapassam 3 meses. Bancos costumam aceitar descontos de até 60% para liquidação à vista com dinheiro poupado.</p>
                    </div>
                </div>

                <!-- CARD 3: PLANEJADOR DE CRESCIMENTO E METAS -->
                <div class="card" style="background: rgba(15, 23, 42, 0.8); border: 1px solid var(--glass-border); padding: 1.5rem;">
                    <h4 style="color: #fbbf24; font-size: 1.1rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="trending-up" style="width: 20px;"></i> Plano de Independência Financeira
                    </h4>

                    <div style="display: flex; flex-direction: column; gap: 1.2rem;">
                        <div style="display: flex; gap: 10px; align-items: flex-start;">
                            <span style="background: var(--accent-color); color: #000; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; flex-shrink: 0;">1</span>
                            <div>
                                <h5 style="color: white; font-size: 0.9rem; margin-bottom: 4px;">Curto Prazo: Reserva de Emergência</h5>
                                <p style="font-size: 0.8rem; color: var(--text-secondary);">Sua meta é acumular 6 meses de gastos (R$ ${(totalExpenses * 6).toFixed(2)}). Guardando 10% do seu salário, você leva cerca de 60 meses, mas se economizar no lazer, reduz para 36 meses.</p>
                            </div>
                        </div>

                        <div style="display: flex; gap: 10px; align-items: flex-start;">
                            <span style="background: var(--accent-color); color: #000; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; flex-shrink: 0;">2</span>
                            <div>
                                <h5 style="color: white; font-size: 0.9rem; margin-bottom: 4px;">Médio Prazo: Investimentos em Renda Fixa</h5>
                                <p style="font-size: 0.8rem; color: var(--text-secondary);">Com seu perfil atual, o ideal é alocar em **Tesouro IPCA+** ou **CDBs de 110% do CDI**. Isso protegerá seu dinheiro da inflação.</p>
                            </div>
                        </div>

                        <div style="display: flex; gap: 10px; align-items: flex-start;">
                            <span style="background: var(--accent-color); color: #000; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; flex-shrink: 0;">3</span>
                            <div>
                                <h5 style="color: white; font-size: 0.9rem; margin-bottom: 4px;">Longo Prazo: Renda Passiva</h5>
                                <p style="font-size: 0.8rem; color: var(--text-secondary);">Para se aposentar com uma renda igual ao seu salário atual (R$ ${incomeValue.toFixed(2)}), você precisa de um patrimônio de aprox. **R$ ${(incomeValue * 150).toFixed(0)}**. Comece com R$ ${(incomeValue * 0.1).toFixed(2)} mensais hoje em Fundos Imobiliários.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- CARD 4: MENTALIDADE FINANCEIRA -->
                <div class="card" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(16, 185, 129, 0.1)); border: 1px solid var(--accent-color); padding: 1.5rem;">
                    <h4 style="color: white; font-size: 1rem; margin-bottom: 10px;">Treinamento de Mentalidade</h4>
                    <p style="font-size: 0.85rem; color: var(--text-primary); line-height: 1.6; font-style: italic;">
                        "${first}, lembre-se: Dinheiro não é sobre quanto você ganha, mas sobre quanto você mantém. O seu eu do futuro agradecerá por cada R$ 1,00 que você decidir não gastar por impulso hoje."
                    </p>
                </div>
            `;

            aiResponseText.innerHTML = html;
            lucide.createIcons();
        }, 3000);
    });
}
