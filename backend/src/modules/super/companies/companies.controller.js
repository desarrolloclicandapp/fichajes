const companiesService = require('./companies.service');

// GET /api/super/companies
async function list(req, res) {
  try {
    const companies = await companiesService.listCompanies();
    res.json(companies);
  } catch (err) {
    console.error('List companies error:', err);
    res
      .status(err.status || 500)
      .json({ message: err.message || 'Error al listar empresas' });
  }
}

// POST /api/super/companies
async function create(req, res) {
  try {
    const { name, taxId } = req.body;
    const company = await companiesService.createCompany({ name, taxId });
    res.status(201).json(company);
  } catch (err) {
    console.error('Create company error:', err);
    res
      .status(err.status || 500)
      .json({ message: err.message || 'Error al crear empresa' });
  }
}

// GET /api/super/companies/:id
async function getOne(req, res) {
  try {
    const company = await companiesService.getCompany({
      companyId: req.params.id,
    });
    res.json(company);
  } catch (err) {
    console.error('Get company error:', err);
    res
      .status(err.status || 500)
      .json({ message: err.message || 'Error al obtener empresa' });
  }
}

// PUT /api/super/companies/:id
async function update(req, res) {
  try {
    const company = await companiesService.updateCompany({
      companyId: req.params.id,
      data: req.body,
    });
    res.json(company);
  } catch (err) {
    console.error('Update company error:', err);
    res
      .status(err.status || 500)
      .json({ message: err.message || 'Error al actualizar empresa' });
  }
}

// PATCH /api/super/companies/:id/status
async function setStatus(req, res) {
  try {
    const { isActive } = req.body;
    const company = await companiesService.setCompanyStatus({
      companyId: req.params.id,
      isActive,
    });
    res.json(company);
  } catch (err) {
    console.error('Set company status error:', err);
    res
      .status(err.status || 500)
      .json({ message: err.message || 'Error al cambiar estado de empresa' });
  }
}

// GET /api/super/companies/:id/admins
async function listAdmins(req, res) {
  try {
    const admins = await companiesService.listCompanyAdmins({
      companyId: req.params.id,
    });
    res.json(admins);
  } catch (err) {
    console.error('List company admins error:', err);
    res
      .status(err.status || 500)
      .json({ message: err.message || 'Error al listar administradores' });
  }
}

// POST /api/super/companies/:id/admins
async function createAdmin(req, res) {
  try {
    const { email, fullName, password } = req.body;
    const admin = await companiesService.createCompanyAdmin({
      companyId: req.params.id,
      email,
      fullName,
      password,
    });
    res.status(201).json(admin);
  } catch (err) {
    console.error('Create company admin error:', err);
    res
      .status(err.status || 500)
      .json({ message: err.message || 'Error al crear administrador' });
  }
}

module.exports = {
  list,
  create,
  getOne,
  update,
  setStatus,
  listAdmins,
  createAdmin,
};
