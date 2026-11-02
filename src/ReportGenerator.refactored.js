const PRIORITY_THRESHOLD = 1000;
const USER_MAX_VALUE = 500;

// --- Formatadores: um por tipo de relatório (substitui os if/else de CSV/HTML) ---
const csvFormatter = {
  header: () => 'ID,NOME,VALOR,USUARIO\n',
  row: (item, user) => `${item.id},${item.name},${item.value},${user.name}\n`,
  footer: (total) => `\nTotal,,\n${total},,\n`,
};

const htmlFormatter = {
  header: (user) =>
    [
      '<html><body>',
      '<h1>Relatório</h1>',
      `<h2>Usuário: ${user.name}</h2>`,
      '<table>',
      '<tr><th>ID</th><th>Nome</th><th>Valor</th></tr>',
    ].join('\n') + '\n',
  row: (item, user, highlightPriority) => {
    const style = highlightPriority && item.priority ? ' style="font-weight:bold;"' : '';
    return `<tr${style}><td>${item.id}</td><td>${item.name}</td><td>${item.value}</td></tr>\n`;
  },
  footer: (total) => `</table>\n<h3>Total: ${total}</h3>\n</body></html>\n`,
};

// --- Políticas de acesso: uma por perfil (substitui os if/else de ADMIN/USER) ---
const adminPolicy = {
  highlightPriority: true,
  prepare: (item) => {
    if (item.value > PRIORITY_THRESHOLD) {
      item.priority = true;
    }
  },
  canView: () => true,
};

const userPolicy = {
  highlightPriority: false,
  prepare: () => {},
  canView: (item) => item.value <= USER_MAX_VALUE,
};

// Map evita que chaves herdadas de Object.prototype ("constructor", etc.) sejam aceitas.
const FORMATTERS = new Map([
  ['CSV', csvFormatter],
  ['HTML', htmlFormatter],
]);

const POLICIES = new Map([
  ['ADMIN', adminPolicy],
  ['USER', userPolicy],
]);

function selectVisibleItems(policy, items) {
  const allItems = [...items];
  allItems.forEach(policy.prepare);
  return allItems.filter(policy.canView);
}

function sumValues(items) {
  return items.reduce((total, item) => total + item.value, 0);
}

export class ReportGenerator {
  constructor(database) {
    this.db = database;
  }

  /**
   * Gera um relatório de itens baseado no tipo e no usuário.
   * - Admins veem tudo.
   * - Users comuns só veem itens com valor <= 500.
   */
  generateReport(reportType, user, items) {
    const formatter = FORMATTERS.get(reportType);
    const policy = POLICIES.get(user.role);
    const visibleItems = policy ? selectVisibleItems(policy, items) : [];

    if (!formatter) {
      return '';
    }

    const body = visibleItems
      .map((item) => formatter.row(item, user, policy.highlightPriority))
      .join('');

    return (formatter.header(user) + body + formatter.footer(sumValues(visibleItems))).trim();
  }
}
