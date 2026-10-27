const express = require('express');
const service = require('./service');
const path = require('path');
const { engine } = require('express-handlebars');

const app = express();
const PORT = 3000;

app.engine('handlebars', engine({
  defaultLayout: false
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());

app.get('/', (req, res) => {
  res.render('home', {
    routes: service.getRoutes()
  });
});

function checkRoute(req, res, next) {
  const route = req.params.route;

  if (!service.getRoutes().includes(route)) {
    return res.status(404).json({
      error: `Route ${route} not found`
    });
  }

  next();
}

// GET all records
app.get('/:route', checkRoute, (req, res) => {
  const route = req.params.route;
  const embed = req.query._embed;

  const result = service.getAll(route).map(record => {
    if (!embed) {
      return record;
    }

    return {
      ...record,
      [embed]: service.getEmbeddedRecords(route, record, embed)
    };
  });

  res.json(result);
});

// GET record by ID
app.get('/:route/:id', checkRoute, (req, res) => {
  const { route, id } = req.params;
  const embed = req.query._embed;

  const record = service.getById(route, id);

  if (!record) {
    return res.status(404).json({
      error: `Record with ID ${id} not found in ${route}`
    });
  }

  if (!embed) {
    return res.json(record);
  }

  res.json({...record, [embed]: service.getEmbeddedRecords(route, record, embed)});
});

// POST new record
app.post('/:route', checkRoute, (req, res) => {
  const newRecord = service.create(req.params.route, req.body);
  res.status(201).json(newRecord);
});

// PUT update record
app.put('/:route/:id', checkRoute, (req, res) => {
  const { route, id } = req.params;

  const updatedRecord = service.update(route, id, req.body);

  if (!updatedRecord) {
    return res.status(404).json({
      error: `Record with ID ${id} not found in ${route}`
    });
  }

  res.json(updatedRecord);
});

// DELETE record
app.delete('/:route/:id', checkRoute, (req, res) => {
  const { route, id } = req.params;

  const deletedRecord = service.remove(route, id);

  if (!deletedRecord) {
    return res.status(404).json({
      error: `Record with ID ${id} not found in ${route}`
    });
  }

  res.json(deletedRecord);
});

const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
}).on('error', err => {
  console.error('Server failed to start:', err);
  process.exit(1);
});

const shutdown = () => {
  console.log('Shutting down...');

  server.close(() => {
    try {
      service.saveConfig();
      process.exit(0);
    } catch (error) {
      process.exit(1);
    }
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);