
const express = require('express');
const mercadopago = require('mercadopago');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.use(express.static('public'));

mercadopago.configure({
  access_token: 'APP_USR-8259792445335336-080911-dea2c74872b688a02354a83a497effba-1445374797'
});

const payments = []; // Array para armazenar os detalhes dos pagamentos

// Rota para criar preferência de pagamento
app.post('/criar-preferencia', async (req, res) => {
  try {
    const itemAmount = 0.01;

    const preference = {
      items: [
        {
          title: 'Crédito de saldo',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: itemAmount
        }
      ],
      back_urls: {
        success: 'https://pagagora.onrender.com/sucesso',
        failure: 'https://pagagora.onrender.com/falha',
        pending: 'https://pagagora.onrender.com/pendente'
      }
    };

    const response = await mercadopago.preferences.create(preference);

    const paymentLink = response.body.init_point;

    // Armazene os detalhes do pagamento em memória
    const paymentDetails = {
      id: response.body.id,
      amount: itemAmount,
      status: 'pendente' // Define como pendente inicialmente
    };
    payments.push(paymentDetails);

    // Redirecione o usuário para a página de pagamento do Mercado Pago
    res.redirect(paymentLink);
  } catch (error) {
    console.error('Erro ao criar preferência:', error);
    res.status(500).json({ error: 'Erro ao criar preferência de pagamento' });
  }
});

// Rota para receber notificações de pagamento (webhooks)
app.post('/notificacoes', (req, res) => {
  const { body } = req;

  if (!mercadopago.validateWebhook(body)) {
    console.warn('Notificação inválida do Mercado Pago');
    return res.status(400).end();
  }

  const paymentId = body.data.id;
  const paymentStatus = body.type;

  const payment = payments.find(p => p.id === paymentId);
  if (paymentStatus === 'payment' && payment) {
    // Atualize o status do pagamento em memória
    payment.status = 'pago';

    // Redirecione o usuário para a página de sucesso
    res.redirect('/sucesso?payment_id=' + paymentId);
  }

  res.status(200).end();
});


// Rota para a página de sucesso
app.get('/sucesso', (req, res) => {
  // Recupere os detalhes da transação do banco de dados
  const paymentAmount = 0.01; // Suponha que o valor seja 1 centavo
  const paymentId = req.query.payment_id; // Suponha que você passe o ID do pagamento como parâmetro de consulta

  res.render('success', { paymentAmount, paymentId });
});

// Rota para a página de falha
app.get('/falha', (req, res) => {
  res.render('failure');
});

app.get('/', (req, res) => {
  res.render('payment');
});
// Rota para a página pendente
app.get('/pendente', (req, res) => {
  res.render('pending');
});


app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
