// backend/src/modules/admin/reports/reports.controller.js
const reportsService = require('./reports.service');

async function summary(req, res) {
  try {
    const { from, to } = req.query;
    const data = await reportsService.getCompanySummary({
      requester: req.user,
      fromStr: from,
      toStr: to,
    });
    res.json(data);
  } catch (err) {
    console.error('Summary report error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Error al generar reporte' });
  }
}

async function exportCsv(req, res) {
  try {
    const { from, to } = req.query;
    const { csv, range } = await reportsService.getCompanySummaryCsv({
      requester: req.user,
      fromStr: from,
      toStr: to,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="reporte_${range.from}_${range.to}.csv"`,
    );
    res.send(csv);
  } catch (err) {
    console.error('Export CSV error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Error al exportar CSV' });
  }
}

async function dailyByWorker(req, res) {
  try {
    const { from, to } = req.query;
    const { userId } = req.params;

    const data = await reportsService.getWorkerDaily({
      requester: req.user,
      fromStr: from,
      toStr: to,
      workerId: userId,
    });

    res.json(data);
  } catch (err) {
    console.error('Worker daily report error:', err);
    res.status(err.status || 500).json({
      message: err.message || 'Error al obtener detalle diario',
    });
  }
}

module.exports = {
  summary,
  exportCsv,
  dailyByWorker,   // <-- añade esto
};


