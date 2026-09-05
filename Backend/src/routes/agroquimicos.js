const express = require('express');
const pool = require('../db');
const { verificarToken, requiereRol } = require('../middleware/auth');

const router = express.Router();

router.use(verificarToken);

const rolesGestion = requiereRol('administrador', 'gerente', 'agronomo');

const TIPOS = ['fungicida', 'insecticida', 'fertilizante', 'herbicida', 'otros'];

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_agroquimico, nombre, ingrediente_activo, registro_ica, tipo_producto,
              dosis_recomendada, dias_carencia, activo, created_at, updated_at
       FROM agroquimicos ORDER BY nombre`
    );
    res.json({ status: 'ok', agroquimicos: rows });
  } catch (err) {
    console.error('Error listando agroquímicos:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

router.post('/', rolesGestion, async (req, res) => {
  const { nombre, ingrediente_activo, registro_ica, tipo_producto, dosis_recomendada, dias_carencia } = req.body;

  if (!nombre || !ingrediente_activo || !registro_ica || dias_carencia === undefined || dias_carencia === null) {
    return res.status(400).json({ status: 'error', message: 'nombre, ingrediente_activo, registro_ica y dias_carencia son obligatorios' });
  }

  if (typeof dias_carencia !== 'number' || dias_carencia < 0) {
    return res.status(400).json({ status: 'error', message: 'dias_carencia debe ser un número mayor o igual a 0' });
  }

  if (tipo_producto && !TIPOS.includes(tipo_producto)) {
    return res.status(400).json({ status: 'error', message: 'tipo_producto inválido' });
  }

  try {
    const [existe] = await pool.query('SELECT id_agroquimico FROM agroquimicos WHERE registro_ica = ?', [registro_ica]);
    if (existe.length > 0) {
      return res.status(409).json({ status: 'error', message: 'Ya existe un agroquímico con ese registro ICA' });
    }

    const [result] = await pool.query(
      `INSERT INTO agroquimicos (nombre, ingrediente_activo, registro_ica, tipo_producto, dosis_recomendada, dias_carencia)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, ingrediente_activo, registro_ica, tipo_producto || 'otros', dosis_recomendada || null, dias_carencia]
    );

    const [nuevo] = await pool.query('SELECT * FROM agroquimicos WHERE id_agroquimico = ?', [result.insertId]);
    res.status(201).json({ status: 'ok', message: 'Agroquímico creado', agroquimico: nuevo[0] });
  } catch (err) {
    console.error('Error creando agroquímico:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

router.put('/:id', rolesGestion, async (req, res) => {
  const { id } = req.params;
  const { nombre, ingrediente_activo, registro_ica, tipo_producto, dosis_recomendada, dias_carencia } = req.body;

  try {
    const [existe] = await pool.query('SELECT * FROM agroquimicos WHERE id_agroquimico = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Agroquímico no encontrado' });
    }

    if (dias_carencia !== undefined && (typeof dias_carencia !== 'number' || dias_carencia < 0)) {
      return res.status(400).json({ status: 'error', message: 'dias_carencia debe ser un número mayor o igual a 0' });
    }

    if (tipo_producto && !TIPOS.includes(tipo_producto)) {
      return res.status(400).json({ status: 'error', message: 'tipo_producto inválido' });
    }

    await pool.query(
      `UPDATE agroquimicos SET
         nombre = ?, ingrediente_activo = ?, registro_ica = ?, tipo_producto = ?,
         dosis_recomendada = ?, dias_carencia = ?
       WHERE id_agroquimico = ?`,
      [
        nombre ?? existe[0].nombre,
        ingrediente_activo ?? existe[0].ingrediente_activo,
        registro_ica ?? existe[0].registro_ica,
        tipo_producto ?? existe[0].tipo_producto,
        dosis_recomendada ?? existe[0].dosis_recomendada,
        dias_carencia ?? existe[0].dias_carencia,
        id
      ]
    );

    const [actualizado] = await pool.query('SELECT * FROM agroquimicos WHERE id_agroquimico = ?', [id]);
    res.json({ status: 'ok', message: 'Agroquímico actualizado', agroquimico: actualizado[0] });
  } catch (err) {
    console.error('Error actualizando agroquímico:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

router.delete('/:id', rolesGestion, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('UPDATE agroquimicos SET activo = FALSE WHERE id_agroquimico = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'Agroquímico no encontrado' });
    }
    res.json({ status: 'ok', message: 'Agroquímico desactivado' });
  } catch (err) {
    console.error('Error desactivando agroquímico:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

module.exports = router;