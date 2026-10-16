/* =============================================
   Pruebas del motor de nómina (server/src/nomina.js).
   Son funciones puras: no tocan Postgres, así que
   corren rápido y sin infraestructura.
   ============================================= */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  calcularNovedad,
  salarioDocentePorCategoria,
  liquidar,
  totalizar,
  retencionEnLaFuente,
  rentaExenta,
  TIPOS_NOVEDAD,
} from '../src/nomina.js';

const UVT = 47000;
const SMLMV = 1300000;

test('calcularNovedad: incapacidad descuenta los días', () => {
  const r = calcularNovedad({ tipo: TIPOS_NOVEDAD.INCAPACIDAD, dias: 3 }, 3000000);
  assert.deepEqual(r, { valor: 300000, tipoAjuste: 'descuento', excluye: false });
});

test('calcularNovedad: licencia remunerada no descuenta', () => {
  const r = calcularNovedad({ tipo: TIPOS_NOVEDAD.LICENCIA, modalidad: 'remunerada', dias: 5 }, 3000000);
  assert.equal(r.valor, 0);
  assert.equal(r.tipoAjuste, 'ninguno');
});

test('calcularNovedad: licencia no remunerada descuenta los días', () => {
  const r = calcularNovedad({ tipo: TIPOS_NOVEDAD.LICENCIA, modalidad: 'no_remunerada', dias: 5 }, 3000000);
  assert.equal(r.valor, 500000);
  assert.equal(r.tipoAjuste, 'descuento');
});

test('calcularNovedad: retiro excluye de la corrida', () => {
  assert.equal(calcularNovedad({ tipo: TIPOS_NOVEDAD.RETIRO }, 3000000).excluye, true);
});

test('calcularNovedad: bonificación es ingreso por su valor', () => {
  const r = calcularNovedad({ tipo: TIPOS_NOVEDAD.BONIFICACION, valor: 500000 }, 3000000);
  assert.deepEqual(r, { valor: 500000, tipoAjuste: 'ingreso', excluye: false });
});

test('calcularNovedad: horas extra usan valor hora y recargo 125%', () => {
  // 3.000.000 / 240 = 12.500 la hora; x10 x1.25 = 156.250
  const r = calcularNovedad({ tipo: TIPOS_NOVEDAD.HORAS_EXTRA, horas: 10 }, 3000000);
  assert.equal(r.valor, 156250);
  assert.equal(r.tipoAjuste, 'ingreso');
});

test('calcularNovedad: tipo desconocido no ajusta nada', () => {
  assert.deepEqual(calcularNovedad({ tipo: 'otro' }, 3000000), { valor: 0, tipoAjuste: 'ninguno', excluye: false });
});

test('salarioDocentePorCategoria: usa la escala y cae a un default', () => {
  assert.equal(salarioDocentePorCategoria('Docente titular'), 6500000);
  assert.equal(salarioDocentePorCategoria('Categoría inexistente'), 3000000);
});

test('liquidar: salario bajo mínimo no retiene y descuenta salud/pensión', () => {
  const l = liquidar({ id: 1, salario: 4000000 }, { uvt: UVT, smlmv: SMLMV });
  assert.equal(l.devengado, 4000000);
  assert.equal(l.retencion, 0);
  assert.equal(l.neto, 3680000); // 4.000.000 - 160.000 - 160.000
  const codigos = l.conceptos.map((c) => c.codigo);
  assert.ok(codigos.includes('SALARIO'));
  assert.ok(codigos.includes('SALUD'));
  assert.ok(codigos.includes('PENSION'));
  assert.ok(!codigos.includes('SOLIDARIDAD'));
  assert.ok(!codigos.includes('RETENCION'));
});

test('liquidar: fondo de solidaridad desde 4 SMLMV', () => {
  const l = liquidar({ id: 1, salario: 6000000 }, { uvt: UVT, smlmv: SMLMV });
  // 6.000.000 > 4 x 1.300.000 => 1% = 60.000
  assert.equal(l.conceptos.find((c) => c.codigo === 'SOLIDARIDAD')?.valor, 60000);
  assert.equal(l.neto, 5460000); // 6.000.000 - 240.000 - 240.000 - 60.000
});

test('liquidar: ingresos extra suman al devengado y base', () => {
  const l = liquidar(
    { id: 2, salario: 3000000 },
    { uvt: UVT, smlmv: SMLMV, ingresosExtra: [{ codigo: 'HORAS_EXTRA', valor: 250000 }] }
  );
  assert.equal(l.devengado, 3250000);
  assert.equal(l.neto, 2990000); // -130.000 salud -130.000 pensión
});

test('liquidar: ajuste de devengado (bonificación) sube el neto', () => {
  const l = liquidar(
    { id: 3, salario: 3000000 },
    { uvt: UVT, smlmv: SMLMV, ajustes: [{ tipo: 'devengado', codigo: 'BONIFICACION', valor: 500000 }] }
  );
  assert.equal(l.devengado, 3500000);
  assert.equal(l.neto, 3220000); // -140.000 -140.000
});

test('liquidar: ajuste de descuento (incapacidad) baja el neto', () => {
  const l = liquidar(
    { id: 4, salario: 3000000 },
    { uvt: UVT, smlmv: SMLMV, ajustes: [{ tipo: 'deduccion', codigo: 'INCAPACIDAD', valor: 300000 }] }
  );
  assert.equal(l.neto, 2460000); // 3.000.000 -120.000 -120.000 -300.000
});

test('liquidar: salario alto paga retención en la fuente', () => {
  const l = liquidar({ id: 5, salario: 20000000 }, { uvt: UVT, smlmv: SMLMV });
  assert.equal(l.retencion, 2381150);
  assert.equal(l.neto, 15818850);
});

test('liquidar: prefiere baseSalarial sobre salario', () => {
  const l = liquidar({ id: 5, baseSalarial: 5000000, salario: 3000000 }, { uvt: UVT, smlmv: SMLMV });
  assert.equal(l.devengado, 5000000);
});

test('liquidar: acepta fechaPago sin alterar los números', () => {
  const conFecha = liquidar({ id: 6, salario: 3000000 }, { uvt: UVT, smlmv: SMLMV, fechaPago: '2026-09-30' });
  const sinFecha = liquidar({ id: 6, salario: 3000000 }, { uvt: UVT, smlmv: SMLMV });
  assert.equal(conFecha.neto, sinFecha.neto);
});

test('totalizar: suma devengado, deducciones, neto y retención', () => {
  const a = liquidar({ id: 1, salario: 4000000 }, { uvt: UVT, smlmv: SMLMV });
  const b = liquidar({ id: 2, salario: 3000000 }, { uvt: UVT, smlmv: SMLMV });
  const t = totalizar([a, b]);
  assert.equal(t.devengado, a.devengado + b.devengado);
  assert.equal(t.neto, a.neto + b.neto);
  assert.equal(t.deducciones, a.deducciones + b.deducciones);
});

test('totalizar: lista vacía es todo ceros', () => {
  assert.deepEqual(totalizar([]), { devengado: 0, deducciones: 0, neto: 0, retencion: 0 });
});

test('retencionEnLaFuente: bajo 95 UVT no retiene', () => {
  assert.equal(retencionEnLaFuente(95 * UVT, UVT), 0);
  assert.equal(retencionEnLaFuente(0, UVT), 0);
});

test('retencionEnLaFuente: sin UVT no retiene', () => {
  assert.equal(retencionEnLaFuente(10000000, 0), 0);
});

test('rentaExenta: 25% con tope de 240 UVT', () => {
  assert.equal(rentaExenta(10000000, UVT), 2500000);
  assert.equal(rentaExenta(1, UVT), 0);
  // base enorme: el tope manda
  assert.equal(rentaExenta(100000000, UVT), 240 * UVT);
});
