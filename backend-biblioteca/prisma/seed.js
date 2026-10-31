import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper para generar fechas YYYY-MM-DD relativas al día actual (últimos 2 meses)
function fechaHaceDias(diasAtras) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - diasAtras);
  return fecha.toISOString().split('T')[0];
}

async function main() {
  console.log('🌱 Iniciando siembra de datos (Seeding)...');

  // 1. Limpiar base de datos previa
  await prisma.detalleVenta.deleteMany();
  await prisma.venta.deleteMany();
  await prisma.ajusteInventario.deleteMany();
  await prisma.entradaInventario.deleteMany();
  await prisma.libro.deleteMany();
  await prisma.distribuidor.deleteMany();
  await prisma.lector.deleteMany();
  await prisma.bitacora.deleteMany();
  await prisma.sesionUsuario.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.$executeRawUnsafe('DELETE FROM sqlite_sequence;').catch(() => {});

  // 2. Crear Usuarios (Personal del Sistema) con contraseñas encriptadas
  const hashedPasswordAdmin = await bcrypt.hash('admin123', 10);
  const hashedPasswordStaff = await bcrypt.hash('staff123', 10);

  const admin = await prisma.usuario.create({
    data: {
      cedula: 'V-24123456',
      nombre: 'Jheisel Parra',
      fechaNacimiento: '1998-04-15',
      email: 'admin@biblioteca.com',
      password: hashedPasswordAdmin,
      rol: 'admin',
      estado: 'Activo'
    }
  });

  const staff = await prisma.usuario.create({
    data: {
      cedula: 'V-26890123',
      nombre: 'Carlos Mendoza',
      fechaNacimiento: '1995-08-22',
      email: 'carlos@biblioteca.com',
      password: hashedPasswordStaff,
      rol: 'staff',
      estado: 'Activo'
    }
  });

  const staff2 = await prisma.usuario.create({
    data: {
      cedula: 'V-28112344',
      nombre: 'María Delgado',
      fechaNacimiento: '1999-11-10',
      email: 'maria@biblioteca.com',
      password: hashedPasswordStaff,
      rol: 'staff',
      estado: 'Inactivo'
    }
  });

  console.log('✅ Usuarios del sistema creados exitosamente:');
  console.log('   - Admin: admin@biblioteca.com / admin123 (Rol: admin)');
  console.log('   - Staff: carlos@biblioteca.com / staff123 (Rol: staff)');

  // 3. Crear Distribuidores
  const distPenguin = await prisma.distribuidor.create({
    data: {
      rif: 'J-30589123-4',
      nombre: 'Penguin Random House Grupo Editorial',
      contacto: 'Laura Martínez',
      correo: 'ventas@penguinrandomhouse.com',
      telefono: '0212-9012345',
      direccion: 'Av. Francisco de Miranda, Edif. Parque Cristal, Caracas',
      estado: 'Activo'
    }
  });

  const distPlaneta = await prisma.distribuidor.create({
    data: {
      rif: 'J-30812456-7',
      nombre: 'Grupo Planeta',
      contacto: 'Roberto Gómez',
      correo: 'pedidos@planeta.com.ve',
      telefono: '0212-7894561',
      direccion: 'Centro Empresarial Las Mercedes, Piso 5, Caracas',
      estado: 'Activo'
    }
  });

  const distEkare = await prisma.distribuidor.create({
    data: {
      rif: 'J-00124589-2',
      nombre: 'Ediciones Ekaré',
      contacto: 'Carmen Elena',
      correo: 'contacto@ekare.com.ve',
      telefono: '0212-2647890',
      direccion: 'Los Palos Grandes, 4ta Avenida, Caracas',
      estado: 'Activo'
    }
  });

  const distSantillana = await prisma.distribuidor.create({
    data: {
      rif: 'J-00349812-5',
      nombre: 'Editorial Santillana',
      contacto: 'Felipe Vargas',
      correo: 'atencion@santillana.com.ve',
      telefono: '0212-3216549',
      direccion: 'Boleíta Norte, Calle 3, Caracas',
      estado: 'Activo'
    }
  });

  console.log('✅ Distribuidores registrados: 4');

  // 4. Crear Lectores
  const lector1 = await prisma.lector.create({
    data: {
      cedula: 'V-26890123',
      nombre: 'Carlos Mendoza',
      fechaNacimiento: '1994-03-21',
      correo: 'carlos.mendoza@email.com',
      telefono: '0414-1234567',
      direccion: 'Urb. Los Chaguaramos, Calle 4, Casa 12'
    }
  });

  const lector2 = await prisma.lector.create({
    data: {
      cedula: 'V-28112344',
      nombre: 'María Delgado',
      fechaNacimiento: '1999-07-14',
      correo: 'maria.delgado@email.com',
      telefono: '0424-9876543',
      direccion: 'Av. Bolívar, Res. El Parque, Apto 4B'
    }
  });

  const lector3 = await prisma.lector.create({
    data: {
      cedula: 'V-25443122',
      nombre: 'Andrés López',
      fechaNacimiento: '1988-12-05',
      correo: 'andres.lopez@email.com',
      telefono: '0412-5554321',
      direccion: 'Calle El Comercio, Edif. Plaza, Piso 2'
    }
  });

  const lector4 = await prisma.lector.create({
    data: {
      cedula: 'V-29874512',
      nombre: 'Valeria Salazar',
      fechaNacimiento: '2001-01-19',
      correo: 'valeria.salazar@email.com',
      telefono: '0414-8892341',
      direccion: 'Av. Libertador, Res. Sol, Piso 7'
    }
  });

  const lector5 = await prisma.lector.create({
    data: {
      cedula: 'V-21339087',
      nombre: 'Gabriel Morales',
      fechaNacimiento: '1996-10-08',
      correo: 'gabriel.morales@email.com',
      telefono: '0424-3319082',
      direccion: 'Urb. Altamira, Av. San Juan Bosco'
    }
  });

  const lector6 = await prisma.lector.create({
    data: {
      cedula: 'V-30118920',
      nombre: 'Sofía Castellanos',
      fechaNacimiento: '2000-05-25',
      correo: 'sofia.castellanos@email.com',
      telefono: '0412-9014423',
      direccion: 'Urb. La Castellana, Calle Principal'
    }
  });

  console.log('✅ Lectores registrados: 6');

  // 5. Crear Libros (6 libros en catálogo)
  const libro1 = await prisma.libro.create({
    data: {
      isbn: '978-0307474728',
      titulo: 'Cien años de soledad',
      autor: 'Gabriel García Márquez',
      categoria: 'Novela',
      precio: 15.00,
      precioCosto: 9.00,
      ejemplares: 6,
      portada: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=200',
      distribuidorId: distPenguin.id,
      activo: true
    }
  });

  const libro2 = await prisma.libro.create({
    data: {
      isbn: '978-8424116026',
      titulo: 'Don Quijote de la Mancha',
      autor: 'Miguel de Cervantes',
      categoria: 'Clásico',
      precio: 22.50,
      precioCosto: 13.50,
      ejemplares: 3,
      portada: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=200',
      distribuidorId: distPlaneta.id,
      activo: true
    }
  });

  const libro3 = await prisma.libro.create({
    data: {
      isbn: '978-0156013987',
      titulo: 'El principito',
      autor: 'Antoine de Saint-Exupéry',
      categoria: 'Infantil / Juvenil',
      precio: 10.00,
      precioCosto: 5.50,
      ejemplares: 4,
      portada: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=200',
      distribuidorId: distEkare.id,
      activo: true
    }
  });

  const libro4 = await prisma.libro.create({
    data: {
      isbn: '978-1451673319',
      titulo: 'Fahrenheit 451',
      autor: 'Ray Bradbury',
      categoria: 'Ciencia Ficción',
      precio: 18.00,
      precioCosto: 10.50,
      ejemplares: 3,
      portada: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&q=80&w=200',
      distribuidorId: distPenguin.id,
      activo: true
    }
  });

  const libro5 = await prisma.libro.create({
    data: {
      isbn: '978-0451524935',
      titulo: '1984',
      autor: 'George Orwell',
      categoria: 'Ciencia Ficción',
      precio: 16.50,
      precioCosto: 9.50,
      ejemplares: 5,
      portada: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&q=80&w=200',
      distribuidorId: distPenguin.id,
      activo: true
    }
  });

  const libro6 = await prisma.libro.create({
    data: {
      isbn: '978-8408195726',
      titulo: 'Hábitos Atómicos',
      autor: 'James Clear',
      categoria: 'Autoayuda / Desarrollo Personal',
      precio: 20.00,
      precioCosto: 11.50,
      ejemplares: 7,
      portada: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=200',
      distribuidorId: distPlaneta.id,
      activo: true
    }
  });

  console.log('✅ Libros registrados en catálogo: 6');

  // 6. Entradas de Inventario (Compras a Distribuidores en los últimos 2 meses)
  const entradasData = [
    {
      libroId: libro1.id,
      distribuidorId: distPenguin.id,
      cantidadIngresada: 12,
      costoUnitario: 9.00,
      costoTotal: 108.00,
      nroFacturaProveedor: 'FAC-PRH-9921',
      fecha: fechaHaceDias(52),
      hora: '09:30 AM',
      observaciones: 'Lote inicial de reposición de narrativa.',
      responsable: 'Jheisel Parra'
    },
    {
      libroId: libro3.id,
      distribuidorId: distEkare.id,
      cantidadIngresada: 14,
      costoUnitario: 5.50,
      costoTotal: 77.00,
      nroFacturaProveedor: 'GUIA-EK-3012',
      fecha: fechaHaceDias(45),
      hora: '02:15 PM',
      observaciones: 'Adquisición de literatura infantil y juvenil.',
      responsable: 'Jheisel Parra'
    },
    {
      libroId: libro2.id,
      distribuidorId: distPlaneta.id,
      cantidadIngresada: 8,
      costoUnitario: 13.50,
      costoTotal: 108.00,
      nroFacturaProveedor: 'FAC-PLA-4410',
      fecha: fechaHaceDias(36),
      hora: '11:00 AM',
      observaciones: 'Edición conmemorativa de clásicos.',
      responsable: 'Jheisel Parra'
    },
    {
      libroId: libro4.id,
      distribuidorId: distPenguin.id,
      cantidadIngresada: 10,
      costoUnitario: 10.50,
      costoTotal: 105.00,
      nroFacturaProveedor: 'FAC-PRH-10045',
      fecha: fechaHaceDias(27),
      hora: '10:20 AM',
      observaciones: 'Reposición de colección Ciencia Ficción.',
      responsable: 'Jheisel Parra'
    },
    {
      libroId: libro5.id,
      distribuidorId: distPenguin.id,
      cantidadIngresada: 12,
      costoUnitario: 9.50,
      costoTotal: 114.00,
      nroFacturaProveedor: 'FAC-PRH-10112',
      fecha: fechaHaceDias(18),
      hora: '03:40 PM',
      observaciones: 'Ingreso de nuevo título 1984 por alta solicitud.',
      responsable: 'Jheisel Parra'
    },
    {
      libroId: libro6.id,
      distribuidorId: distPlaneta.id,
      cantidadIngresada: 15,
      costoUnitario: 11.50,
      costoTotal: 172.50,
      nroFacturaProveedor: 'FAC-PLA-4589',
      fecha: fechaHaceDias(8),
      hora: '01:10 PM',
      observaciones: 'Compra mensual de títulos de desarrollo personal.',
      responsable: 'Jheisel Parra'
    }
  ];

  for (const entrada of entradasData) {
    await prisma.entradaInventario.create({ data: entrada });
  }

  console.log(`✅ Compras a distribuidores registradas: ${entradasData.length}`);

  // 7. Bajas / Ajustes de Inventario
  await prisma.ajusteInventario.create({
    data: {
      libroId: libro2.id,
      cantidadDescontada: 1,
      motivo: 'Dañado / Deteriorado',
      observaciones: 'Cubierta manchada por humedad durante traslado.',
      fecha: fechaHaceDias(32),
      hora: '09:45 AM',
      responsable: 'Jheisel Parra'
    }
  });

  await prisma.ajusteInventario.create({
    data: {
      libroId: libro3.id,
      cantidadDescontada: 1,
      motivo: 'Dañado / Deteriorado',
      observaciones: 'Ejemplar con encuadernación desprendida en mostrador.',
      fecha: fechaHaceDias(11),
      hora: '04:20 PM',
      responsable: 'Jheisel Parra'
    }
  });

  // 8. Ventas y Detalle de Ventas (16 ventas en los últimos 2 meses, mayoría en el último mes)
  const tasa = 36.50;
  const transaccionesVenta = [
    {
      nroFactura: 'FAC-100440',
      fecha: fechaHaceDias(50),
      hora: '10:15 AM',
      clienteId: lector1.id,
      usuarioId: staff.id,
      metodoPago: 'Punto de Venta',
      referenciaPago: '771204',
      atendidoPor: 'Carlos Mendoza',
      items: [
        { libro: libro1, cantidad: 1 },
        { libro: libro3, cantidad: 1 }
      ]
    },
    {
      nroFactura: 'FAC-100441',
      fecha: fechaHaceDias(44),
      hora: '03:20 PM',
      clienteId: lector2.id,
      usuarioId: admin.id,
      metodoPago: 'Pago Móvil',
      referenciaPago: '983412',
      atendidoPor: 'Jheisel Parra',
      items: [
        { libro: libro2, cantidad: 1 }
      ]
    },
    {
      nroFactura: 'FAC-100442',
      fecha: fechaHaceDias(39),
      hora: '11:45 AM',
      clienteId: lector3.id,
      usuarioId: staff.id,
      metodoPago: 'Efectivo',
      referenciaPago: '',
      atendidoPor: 'Carlos Mendoza',
      items: [
        { libro: libro3, cantidad: 2 }
      ]
    },
    {
      nroFactura: 'FAC-100443',
      fecha: fechaHaceDias(33),
      hora: '04:05 PM',
      clienteId: lector4.id,
      usuarioId: staff.id,
      metodoPago: 'Transferencia Bancaria',
      referenciaPago: '450918',
      atendidoPor: 'Carlos Mendoza',
      items: [
        { libro: libro1, cantidad: 2 }
      ]
    },
    {
      nroFactura: 'FAC-100444',
      fecha: fechaHaceDias(28),
      hora: '09:50 AM',
      clienteId: lector5.id,
      usuarioId: admin.id,
      metodoPago: 'Punto de Venta',
      referenciaPago: '119043',
      atendidoPor: 'Jheisel Parra',
      items: [
        { libro: libro4, cantidad: 1 },
        { libro: libro5, cantidad: 1 }
      ]
    },
    {
      nroFactura: 'FAC-100445',
      fecha: fechaHaceDias(25),
      hora: '01:30 PM',
      clienteId: lector6.id,
      usuarioId: staff.id,
      metodoPago: 'Pago Móvil',
      referenciaPago: '662109',
      atendidoPor: 'Carlos Mendoza',
      items: [
        { libro: libro6, cantidad: 1 },
        { libro: libro3, cantidad: 1 }
      ]
    },
    {
      nroFactura: 'FAC-100446',
      fecha: fechaHaceDias(22),
      hora: '02:45 PM',
      clienteId: lector1.id,
      usuarioId: staff.id,
      metodoPago: 'Punto de Venta',
      referenciaPago: '334890',
      atendidoPor: 'Carlos Mendoza',
      items: [
        { libro: libro5, cantidad: 2 }
      ]
    },
    {
      nroFactura: 'FAC-100447',
      fecha: fechaHaceDias(19),
      hora: '10:30 AM',
      clienteId: lector2.id,
      usuarioId: admin.id,
      metodoPago: 'Efectivo',
      referenciaPago: '',
      atendidoPor: 'Jheisel Parra',
      items: [
        { libro: libro1, cantidad: 1 },
        { libro: libro6, cantidad: 1 }
      ]
    },
    {
      nroFactura: 'FAC-100448',
      fecha: fechaHaceDias(16),
      hora: '03:15 PM',
      clienteId: lector4.id,
      usuarioId: staff.id,
      metodoPago: 'Pago Móvil',
      referenciaPago: '812765',
      atendidoPor: 'Carlos Mendoza',
      items: [
        { libro: libro4, cantidad: 2 }
      ]
    },
    {
      nroFactura: 'FAC-100449',
      fecha: fechaHaceDias(13),
      hora: '11:20 AM',
      clienteId: lector3.id,
      usuarioId: staff.id,
      metodoPago: 'Transferencia Bancaria',
      referenciaPago: '904312',
      atendidoPor: 'Carlos Mendoza',
      items: [
        { libro: libro2, cantidad: 1 },
        { libro: libro3, cantidad: 1 }
      ]
    },
    {
      nroFactura: 'FAC-100450',
      fecha: fechaHaceDias(10),
      hora: '04:40 PM',
      clienteId: lector5.id,
      usuarioId: admin.id,
      metodoPago: 'Punto de Venta',
      referenciaPago: '551298',
      atendidoPor: 'Jheisel Parra',
      items: [
        { libro: libro6, cantidad: 2 }
      ]
    },
    {
      nroFactura: 'FAC-100451',
      fecha: fechaHaceDias(7),
      hora: '11:15 AM',
      clienteId: lector2.id,
      usuarioId: admin.id,
      metodoPago: 'Pago Móvil',
      referenciaPago: '441920',
      atendidoPor: 'Jheisel Parra',
      items: [
        { libro: libro4, cantidad: 1 },
        { libro: libro5, cantidad: 1 }
      ]
    },
    {
      nroFactura: 'FAC-100452',
      fecha: fechaHaceDias(5),
      hora: '02:30 PM',
      clienteId: lector1.id,
      usuarioId: staff.id,
      metodoPago: 'Punto de Venta',
      referenciaPago: '892301',
      atendidoPor: 'Carlos Mendoza',
      items: [
        { libro: libro1, cantidad: 1 },
        { libro: libro3, cantidad: 2 }
      ]
    },
    {
      nroFactura: 'FAC-100453',
      fecha: fechaHaceDias(3),
      hora: '10:05 AM',
      clienteId: lector6.id,
      usuarioId: staff.id,
      metodoPago: 'Pago Móvil',
      referenciaPago: '729104',
      atendidoPor: 'Carlos Mendoza',
      items: [
        { libro: libro5, cantidad: 1 },
        { libro: libro6, cantidad: 1 }
      ]
    },
    {
      nroFactura: 'FAC-100454',
      fecha: fechaHaceDias(2),
      hora: '03:50 PM',
      clienteId: lector4.id,
      usuarioId: admin.id,
      metodoPago: 'Efectivo',
      referenciaPago: '',
      atendidoPor: 'Jheisel Parra',
      items: [
        { libro: libro1, cantidad: 1 },
        { libro: libro4, cantidad: 1 }
      ]
    },
    {
      nroFactura: 'FAC-100455',
      fecha: fechaHaceDias(1),
      hora: '01:25 PM',
      clienteId: lector5.id,
      usuarioId: staff.id,
      metodoPago: 'Punto de Venta',
      referenciaPago: '930184',
      atendidoPor: 'Carlos Mendoza',
      items: [
        { libro: libro6, cantidad: 1 },
        { libro: libro2, cantidad: 1 }
      ]
    }
  ];

  for (const tv of transaccionesVenta) {
    const totalArticulos = tv.items.reduce((acc, it) => acc + it.cantidad, 0);
    const subtotalUSD = parseFloat(
      tv.items.reduce((acc, it) => acc + it.libro.precio * it.cantidad, 0).toFixed(2)
    );
    const montoIvaUSD = parseFloat((subtotalUSD * 0.16).toFixed(2));
    const totalUSD = parseFloat((subtotalUSD + montoIvaUSD).toFixed(2));
    const totalBs = parseFloat((totalUSD * tasa).toFixed(2));

    const ventaCreada = await prisma.venta.create({
      data: {
        nroFactura: tv.nroFactura,
        fecha: tv.fecha,
        hora: tv.hora,
        clienteId: tv.clienteId,
        usuarioId: tv.usuarioId,
        metodoPago: tv.metodoPago,
        referenciaPago: tv.referenciaPago || null,
        subtotal: subtotalUSD,
        porcentajeIva: 16.0,
        montoIva: montoIvaUSD,
        total: totalUSD,
        tasaCambio: tasa,
        totalBs: totalBs,
        totalArticulos: totalArticulos,
        atendidoPor: tv.atendidoPor
      }
    });

    for (const it of tv.items) {
      await prisma.detalleVenta.create({
        data: {
          ventaId: ventaCreada.id,
          libroId: it.libro.id,
          titulo: it.libro.titulo,
          autor: it.libro.autor,
          precioUnitario: it.libro.precio,
          cantidad: it.cantidad,
          subtotal: parseFloat((it.libro.precio * it.cantidad).toFixed(2))
        }
      });
    }
  }

  console.log(`✅ Ventas a lectores sembradas exitosamente: ${transaccionesVenta.length}`);

  // 9. Métodos de Pago Iniciales (mediante SQL compatible con SQLite)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MetodoPago" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "nombre" TEXT NOT NULL,
      "etiqueta" TEXT NOT NULL,
      "icono" TEXT NOT NULL DEFAULT '💳',
      "requiereReferencia" BOOLEAN NOT NULL DEFAULT true,
      "esBase" BOOLEAN NOT NULL DEFAULT false,
      "activo" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "MetodoPago_nombre_key" ON "MetodoPago"("nombre");
  `);

  const metodosIniciales = [
    { nombre: 'Punto de Venta', etiqueta: 'Punto de Venta', icono: '💳', requiereReferencia: 1, esBase: 1, activo: 1 },
    { nombre: 'Pago Móvil', etiqueta: 'Pago Móvil', icono: '📱', requiereReferencia: 1, esBase: 1, activo: 1 },
    { nombre: 'Transferencia Bancaria', etiqueta: 'Transferencia', icono: '🏦', requiereReferencia: 1, esBase: 1, activo: 1 },
    { nombre: 'Efectivo', etiqueta: 'Efectivo ($ / Bs)', icono: '💵', requiereReferencia: 0, esBase: 1, activo: 1 }
  ];

  const ahoraIso = new Date().toISOString();
  for (const m of metodosIniciales) {
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO "MetodoPago" ("nombre", "etiqueta", "icono", "requiereReferencia", "esBase", "activo", "createdAt", "updatedAt")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      m.nombre,
      m.etiqueta,
      m.icono,
      m.requiereReferencia,
      m.esBase,
      m.activo,
      ahoraIso,
      ahoraIso
    );
  }

  console.log('🎉 Seeding completado con éxito!');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
