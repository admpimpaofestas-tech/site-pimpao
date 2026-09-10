// ====== CONFIGURAÇÕES (edite aqui) ======
export const whatsappNumber = '5551991355903';
export const instagramUrl = 'https://instagram.com/pimpaobuffeteventos';

// ====== Derivados ======
export const waNum = whatsappNumber.replace(/\D/g, '');
export const waLink =
  'https://wa.me/' +
  waNum +
  '?text=' +
  encodeURIComponent('Olá! Vim pelo site e gostaria de solicitar um orçamento para uma festa no Pimpão.');
export const ano = new Date().getFullYear();

// ====== Dados ======
const atracaoNomes = ['Brinquedão', 'Área Baby', 'La Bamba', 'Mini Roda Gigante', 'Big Jump', 'Tombo Legal', 'Carrossel de Carrinhos', 'Cama Elástica', 'Futebol', 'Mesa de pinturinhas', 'Air flow'];
export const atracoes = atracaoNomes.map((nome, i) => ({ nome, color: i % 2 === 0 ? '#56a99b' : '#ec7a55' }));

export const recreacao = [
  { titulo: 'Recreação guiada', itens: ['Brincadeiras adaptadas por faixa etária', 'Gincanas interativas', 'Dinâmicas para todas as crianças'] },
  { titulo: 'Diferenciais exclusivos', itens: ['Camarim com pintura artística', 'Esculturas em balões durante a festa', 'Baladinha infantil — o momento favorito!'] },
  { titulo: 'Personalização temática', itens: ['Caça ao tesouro temática', 'Desafios personalizados', 'Atividades do universo do aniversariante'] },
];

export const festas = [
  { nome: 'Festas Brincantes', tag: 'Energia & movimento', desc: 'Foco total na energia da criançada: recreação guiada, gincanas e muita diversão. Praticidade sem abrir mão da qualidade.', accent: '#1d7567', tint: '#e9f5f2', popular: false },
  { nome: 'Festas Clássicas', tag: 'O equilíbrio perfeito', desc: 'Estrutura impecável, gastronomia premium e recreação mágica. A experiência completa que une sofisticação e diversão.', accent: '#c85f3c', tint: '#fdeee7', popular: true },
  { nome: 'Festa Exclusiva', tag: 'Experiência VIP', desc: 'Personalização 360°: identidade visual, gastronomia gourmet e atrações exclusivas. O projeto dos sonhos ganhando vida.', accent: '#a9802a', tint: '#fdf3da', popular: false },
  { nome: 'Festas Adultas & Celebrações', tag: 'Para toda a família', desc: 'Formatura, aniversário adulto, chá de bebê, chá revelação, batizado e confraternizações. Estrutura completa, gastronomia caprichada e decoração sob medida para celebrar em qualquer idade.', accent: '#2f5d8a', tint: '#eaf1f8', popular: false },
];

const galTints = ['#e9f5f2', '#fdeee7', '#fdf3da', '#eaf1f8'];
const galLabels = ['Festa temática', 'Decoração', 'Recreação', 'Mascote Pimpão', 'Playground', 'Mesa de doces', 'Baladinha', 'Camarim'];
export const galeria = galLabels.map((label, i) => ({ label, tint: galTints[i % galTints.length] }));

const depBase = [
  { nome: 'Carolina Morche', festa: 'Aniversário de 2 anos do Lucca', av: '#56a99b', txt: 'Pimpão foi a melhor escolha pro aniversário do nosso pequeno Lucca. Da decoração de Dino Baby aos garçons, às meninas no atendimento e ao pessoal dos brinquedos. Tudo entregue com excelência. Foi um momento incrível e nos sentimos imensamente amados. Recomendo muito!' },
  { nome: 'Fabiana Consul Mendes', festa: 'Cliente Pimpão', av: '#ec7a55', txt: 'A melhor casa de festas de Cachoeirinha! São maravilhosos! As crianças amam o Pimpão. Comida top. Recreacionista Francisco muito criativo nas brincadeiras, nota mil. Espaço kids show!' },
  { nome: 'Luiz Henrique Todt', festa: 'Festa com recreacionista', av: '#a9802a', txt: 'Queremos agradecer a toda equipe Pimpão pelo empenho e carinho com a festa da nossa filha! Recomendo a festa com recreacionista, vale muito a pena. A decoração foi impecável, a comida muito boa e quentinha, e os funcionários muito atenciosos!' },
];
export const depoimentos = depBase.map((d) => ({ ...d, inicial: d.nome.charAt(0) }));

export const faqs = [
  { q: 'Com quanta antecedência preciso reservar?', a: 'Recomendamos reservar com pelo menos 30 a 60 dias de antecedência, especialmente para fins de semana. Fale com a gente: às vezes conseguimos encaixar datas mais próximas.' },
  { q: 'Qual a área de atendimento?', a: 'Estamos na Av. Flores da Cunha, 713 — Cachoeirinha (Parada 49) e atendemos toda a região metropolitana de Porto Alegre.' },
  { q: 'Quais as formas de pagamento?', a: 'Parcele em até 10x no cartão (juros conforme taxas da operadora), ganhe 5% de desconto à vista no PIX, ou use o parcelamento direto com a casa, sem cartão. Consulte condições especiais.' },
  { q: 'A recreação está inclusa?', a: 'Sim! Somos a única casa da região com recreação inclusa: recreação guiada, camarim de pintura, esculturas em balões e a famosa baladinha infantil, sem custo adicional.' },
  { q: 'Vocês fazem festas para adultos?', a: 'Sim! Além das festas infantis, recebemos formaturas, aniversários de adultos, chá de bebê, chá revelação, batizados e confraternizações. A estrutura, o buffet e a decoração são adaptados para cada tipo de celebração.' },
  { q: 'Vocês personalizam o tema da festa?', a: 'Com certeza. Adaptamos toda a recreação e a decoração ao universo do aniversariante — para meninos e meninas, do super-herói ao mundo encantado.' },
  { q: 'Qual a capacidade do espaço?', a: 'Nosso salão climatizado tem 400m² com playground completo. Informe o número estimado de convidados no orçamento e indicamos a melhor opção.' },
];
