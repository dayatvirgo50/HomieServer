const http = require('http');
const express = require('express');
const app = express()
const mysql = require('mysql')
const bodyParser = require('body-parser')
const multer = require('multer')
const jwt = require('jsonwebtoken')
const fs = require('fs')
var secret_key = 'carikos'
var nodemailer = require('nodemailer')


// Koneksi
const conn = mysql.createConnection({
    host: 'sql12.freesqldatabase.com',
    user: 'sql12361327',
    password: 'l7Gw6KVFLA',
    database: 'sql12361327'
})



// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.json());

app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    if (req.method === "OPTIONS") {
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        return res.status(200).json({});
    }
    next();
})

var storageFile = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './images/hunian/')
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + file.originalname)
    }
})

var upload = multer({ storage: storageFile })


// Load Image

app.use('/images', express.static('/images/user/'));
app.use('/images/hunian', express.static('./images/hunian/'));
app.use('/images/hunian/360', express.static('./images/hunian/360/'));
app.use('/images/icon', express.static('./images/icon/'));
app.use('/images/user', express.static('./images/user/'));
app.use('/images/masalah', express.static('./images/masalah/'));
app.use('/images/ulasan', express.static('./images/ulasan/'));
app.use('/images/promo', express.static('./images/promo/'));


// Bagian User

// Komponen Login

app.post('/login', (req, res) => {
    var queryStr = ''
    if (req.query.loginMethod == 'email') {
        queryStr = `select * from tbl_user where email ='${req.query.email}' and password = '${req.query.password}'`
    } else if (req.query.loginMethod == 'tel') {
        queryStr = `select * from tbl_user where tel ='${req.query.tel}' and password = '${req.query.password}'`
    } else if (req.query.loginMethod == 'username') {
        queryStr = `select * from tbl_user where username ='${req.query.username}' and password = '${req.query.password}'`
    }

    conn.query(queryStr, (err, rows) => {
        if (err) { res.status(500).json(err) }
        else {
            console.log(rows)
            if (rows[0] === undefined || rows[0].password !== req.query.password || !rows || rows.length == 0) {
                res.json(false)
            }
            else if (rows[0].password === req.query.password) {
                var payload = {
                    username: rows[0].username,
                    password: rows[0].password
                }
                var token = jwt.sign(payload, secret_key, { expiresIn: '2d' })
                res.status(200).json({
                    id: rows[0].id,
                    username: rows[0].username,
                    password: rows[0].password,
                    nama: rows[0].nama,
                    tel: rows[0].tel,
                    jenis: rows[0].role,
                    token: token
                })
            }
        }
    })
})

// Tambah User

app.post('/register', (req, res) => {
    var username = req.body.username
    var password = req.body.password
    var pin = req.body.pin
    var nama = req.body.nama
    var email = req.body.email
    var alamat = req.body.alamat
    var tel = req.body.tel
    var kota = req.body.kota
    var jk = req.body.jk
    var jenis = req.body.jenis
    var poto = req.body.poto
    var queryStr = `INSERT INTO tbl_user VALUES ('', '${username}', '${password}','${nama}','${email}','${alamat}','${kota}','${tel}','${jk}','${jenis}','${poto}','','','') `;
    var queryStr1 = `INSERT INTO tbl_homiepay (id, username, nama, pin, tel, saldo) VALUES ('', '${username}', '${nama}','${pin}','${tel}','0');`
    conn.query(queryStr, (err, rows) => {
        if (err) res.status(400).json(err), console.log(err)
        else conn.query(queryStr1, (err, rows) => {
            if (err) res.status(400).json(err), console.log(err)
            else res.status(200).json(rows)
        })
    })
})


// Validasi Username
app.get('/check/:username', (req, res) => {
    var queryCheck = `select username from tbl_user where username='${req.params.username}'`
    conn.query(queryCheck, (err, rows) => {
        if (err) res.status(400).json(err), console.log(err)
        else res.status(200).json(rows)
    })
})


// Ganti Password
app.put('/user/change_password/:username', (req, res) => {
    conn.query(`update tbl_user set password='${req.body.password}' WHERE username='${req.params.username}'`, (err, rows) => {
        if (err) res.status(400).json(err), console.log(err)
        else res.status(200).json(rows), console.log('Berhasil Update Password')
    })
})

// Update LastActive and idOneSignal
app.put('/user/update/status/:username', (req, res) => {
    conn.query(`update tbl_user set idOneSignal='${req.body.idOneSignal}' , lastActive='${req.body.lastActive}' where username='${req.params.username}'`, (err, rows) => {
        if (err) res.status(500).json({ message: 'Gagal Update' })
        else res.status(200).json({ message: 'Berhasil Update' })
    })
})

// Profil User
app.get('/profil/:username', (req, res) => {
    conn.query(`select * from tbl_user where username = '${req.params.username}'`, (err, rows) => {
        if (err) res.status(500).json(err), console.log(err)
        else if (!rows[0] || rows[0] == undefined) { res.status(400).json(false) }
        else res.status(200).json(rows[0])
    })
})


// Upload Foto Profil
app.post('/uploadFoto/:username', (req, res) => {
    var poto = req.body.poto // Ambil Data Poto
    var d = Date.now(); // Ambil Waktu Sekarang
    var filename = d + '_IMAGE.jpg'; // Mengubah Nama Poto

    var binaryData = new Buffer(poto, 'base64').toString('binary') // Konversi Poto
    // console.log('Test - ' , binaryData)
    fs.writeFile(__dirname + '/images/user/' + filename, binaryData, 'binary', // Menyimpan dan konversi poto ke folder
        (err) => {
            if (err) res.status(400).json(err)
            else res.status(200).json({ message: 'success' }), console.log('Success')
        })

    // Query untuk mengupdate poto yang sudah di konversi ke database
    conn.query(`UPDATE tbl_user SET poto = '${filename}' WHERE username ='${req.params.username}'`)

})

// Edit Profil
app.put('/profile/edit/:username', (req, res) => {

    console.log(req.body)

    conn.query(`UPDATE tbl_user SET nama = '${req.body.nama}', alamat = '${req.body.alamat}' , kota = '${req.body.kota}' , email = '${req.body.email}' , tel = '${req.body.tel}', team= '${req.body.team}' WHERE username = '${req.params.username}'`, (err, rows) => {
        if (err) {
            res.status(500).json(err),
                console.log(err)
        }
        else {
            res.status(200).end()
        }
    })
})


// Layanan
// Tampilkan Homie Pay
// SELECT * FROM tbl_homiepay as hp INNER JOIN tbl_bank as b on hp.nomorKartu = b.nomorKartu WHERE username='${req.params.username}'

// HomiePay
app.get('/homiepay/:username', (req, res) => {
    conn.query(`SELECT * FROM tbl_homiepay WHERE username='${req.params.username}'`, (err, rows) => {
        if (err) res.status(400).json(err), console.log(err)
        else res.status(200).json(rows[0])
    })
})

// Ganti Pin HomiePay
app.put('/homiepay/update/pin/:username', (req, res) => {
    conn.query(`update tbl_homiepay set pin='${req.body.pin}' WHERE username='${req.params.username}'`, (err, rows) => {
        if (err) res.status(400).json(err), console.log(err)
        else res.status(200).json(rows[0])
    })
})

// List Data Bank Simulasi
app.get('/bank/:noRek', (req, res) => {
    conn.query(`select * from tbl_bank where nomorKartu='${req.params.noRek}'`, (err, rows) => {
        if (err) res.status(400).json(err), console.log(err)
        else res.status(200).json(rows[0])
    })
})

// Edit Saldo HomiePay
app.put(`/homiepay/saldo/:username`, (req, res) => {
    conn.query(`SELECT SUM(nominal) as currentTopUp from tbl_transaksi WHERE username='${req.params.username}' and jenisTransaksi = '${req.body.jenisTransaksi}' and tgl_transaksi ='${req.body.tgl_transaksi}'`, (err, rows) => {
        if (rows[0].currentTopUp >= '1000000') {
            res.status(500).json({ message: 'Sudah Melewati Batas Top Up' })
            console.log(rows)
        } else {
            conn.query(`UPDATE tbl_homiepay SET saldo = '${req.body.saldo}' WHERE username = '${req.params.username}'`, (err, rows) => {
                if (err) {
                    res.status(500).json(err),
                        console.log(err)
                }
                else {
                    res.status(200).json(rows)
                }
            })
        }
    })
})

// Tarik Saldo - Check Nomor Rekening Bank
app.put(`/homiepay/tarik-saldo/:username`, (req, res) => {
    var queryCheckBank = `select * from tbl_bank where noRek='${req.body.noRek}' and nama_bank='${req.body.namaBank}'`
    conn.query(queryCheckBank, (err, rows) => {
        if (rows.length === 0) res.status(400).json(err), console.log(err)
        else if (req.body === null) { res.status(400).json(err), console.log(err) }
        else {
            res.status(200).json({ bank: rows[0] }), console.log(rows[0])
        }
    })
})

// Tambah Kartu Debit
app.put(`/homiepay/tambah-debit/:username`, (req, res) => {
    var queryCheckDebit = `select * from tbl_bank where nomorKartu='${req.body.nomorKartu}'`
    var queryStr = `UPDATE tbl_homiepay SET nomorKartu = '${req.body.nomorKartu}', maxTopUp='${req.body.maxTopUp}' WHERE username = '${req.params.username}'`
    conn.query(queryCheckDebit, (err, rows) => {
        if (rows.length === 0) res.status(400).json(err), console.log(err)
        else if (req.body === null) { res.status(400).json(err), console.log(err) }
        else {
            conn.query(queryStr, (err, rows) => {
                if (err) {
                    res.status(500).json(err),
                        console.log(err)
                }
                else {
                    res.status(200).json(rows)
                }
            })
        }
    })
})


// Delete Kartu Kredit
app.put('/homiepay/delete/kartu-debit/:username', (req, res) => {
    console.log(req.params.username)
    conn.query(`UPDATE tbl_homiepay SET nomorKartu=NULL, maxTopUp=NULL where username='${req.params.username}'`, (err, rows) => {
        if (err) res.status(500).json({ message: 'Gagal Menghapus Kartu Debit' }), console.log(err)
        else res.status(200).json({ message: 'Berhasil Menghapus Kartu Debit' }), console.log(rows)
    })
})


// Tampil Layanan PDAM Simulasi
app.get('/layanan/air/:nomorPelanggan/:kota', (req, res) => {
    conn.query(`select * from tbl_air where noPelanggan='${req.params.nomorPelanggan}' and lokasi='${req.params.kota}'`, (err, rows) => {
        if (err) { res.status(500).json(err), console.log(err) }
        else { res.status(200).json(rows) }
    })
})

// Tampil Layanan Listrik Simulasi
app.get('/layanan/pln/:nomorPelanggan/:jenisListrik', (req, res) => {
    conn.query(`select * from tbl_pln where noPelanggan='${req.params.nomorPelanggan}' and jenisListrik='${req.params.jenisListrik}'`, (err, rows) => {
        if (err) { res.status(500).json(err), console.log(err) }
        else { res.status(200).json(rows) }
    })
})


// Tampil Layanan Pulsa Simulasi
app.get('/layanan/pulsa/:tel', (req, res) => {
    conn.query(`select * from tbl_pulsa where tel='${req.params.tel}'`, (err, rows) => {
        if (err) { res.status(500).json(err), console.log(err) }
        else { res.status(200).json(rows) }
    })
})



// Post Notifikasi
app.post('/notifikasi/add', (req, res) => {
    var { notif_id, username, type, nomor, title, date, read_at } = req.body
    conn.query(`INSERT INTO tbl_notifikasi (id, notif_id, username, type, nomor, title, date, read_at) VALUES ('', '${notif_id}', '${username}', '${type}', '${nomor}', '${title}', '${date}', '${read_at}')`, (err, rows) => {
        if (err) res.status(400).json(err), console.log(err)
        else res.status(200).json(rows)
    })
})


// Tampil Notifikasi
app.get('/notifikasi/list/:username', (req, res) => {
    conn.query(`select * from tbl_notifikasi where username = '${req.params.username}' ORDER BY id DESC`, (err, rows) => {
        if (err) res.status(400).json(err), console.log(err)
        else res.status(200).json(rows)
    })
})

app.put('/notifikasi/update/status/:notif_id', (req, res) => {
    conn.query(`update tbl_notifikasi set read_at='${req.body.read_at}' where notif_id='${req.params.notif_id}'`, (err, rows) => {
        if (err) res.status(500).json({ message: 'Gagal Update Notifikasi' })
        else res.status(200).json({ message: 'Berhasil Update Notifikasi' })
    })
})


// Tampil Riwayat
app.get('/riwayat/list/:username', (req, res) => {
    conn.query(`select * from tbl_transaksi where username = '${req.params.username}'`, (err, rows) => {
        if (err) res.status(400).json(err), console.log(err)
        else res.status(200).json(rows)
    })
})


// Tambah Survei
app.post('/survei/add', (req, res) => {
    var { idHunian, nomorSurvei, username, nama_hunian, tanggalSurvei, waktuSurvei, pesan, usernamePenerima, namaPenerima, tanggalBuat, status, nama } = req.body
    // 	
    conn.query(`INSERT INTO tbl_survei VALUES ('','${idHunian}' ,'${nomorSurvei}', '${username}','${nama}' ,'${nama_hunian}','${tanggalSurvei}','${waktuSurvei}','${pesan}','${usernamePenerima}','${namaPenerima}','${tanggalBuat}','${status}','')`, (err, rows) => {
        if (err) res.status(400).json({ message: 'Survei Gagal Dikirim' }), console.log(err)
        else res.status(200).json(rows)
    })
})

// Tampilkan Survei
app.get('/survei/list/:username', (req, res) => {
    conn.query(`select * from tbl_survei where username = '${req.params.username}' order by tanggalBuat`, (err, rows) => {
        if (err) res.status(400).json(err), console.log(err)
        else res.status(200).json(rows)
    })
})

// Tampilkan Survei Sisi Pemilik
app.get('/survei/list/pemilik/:usernamePenerima', (req, res) => {
    conn.query(`select * from tbl_survei where usernamePenerima = '${req.params.usernamePenerima}'`, (err, rows) => {
        if (err) res.status(400).json(err), console.log(err)
        else res.status(200).json(rows)
    })
})

// Tampil Detail Survei
app.put('/survei/detail/:nomor_survei', (req, res) => {
    conn.query(`UPDATE tbl_survei SET status = '${req.body.statusText}', penolakan = '${req.body.penolakan}' WHERE nomor_survei = '${req.params.nomor_survei}'`, (err, rows) => {
        if (err) {
            res.status(500).json(err), console.log(err)
        }
        else {
            res.status(200).json(rows)
        }
    })
})


// Tambah Transaksi
app.post(`/transaksi/add`, (req, res) => {
    var { no_transaksi, jenisTransaksi, kategoriTransaksi, namaTransaksi, nomor, pemilik, nama_hunian, username, nama, no_kamar, tgl_masuk, tgl_keluar, jangkaWaktu, tgl_transaksi, kodePromo, nominal, periode, metode, status, ref } = req.body
    conn.query(`INSERT INTO tbl_transaksi (id, no_transaksi, jenisTransaksi, kategoriTransaksi, namaTransaksi,nomor, pemilik,nama_hunian,username, nama, no_kamar, tgl_masuk, tgl_keluar, jangkaWaktu, tgl_transaksi, kodePromo, nominal, periode, metode, status, ref) VALUES ('','${no_transaksi}','${jenisTransaksi}','${kategoriTransaksi}','${namaTransaksi}','${nomor}','${pemilik}', '${nama_hunian}','${username}','${nama}', '${no_kamar}', '${tgl_masuk}', '${tgl_keluar}','${jangkaWaktu}','${tgl_transaksi}', '${kodePromo}','${nominal}', '${periode}', '${metode}','${status}', '${ref}')`, (err, rows) => {
        if (err) res.status(400).json(err), console.log(err)
        else res.status(200).json(rows)
    })
})

// Tampil List Transaksi
app.get('/transaksi/list/:username', (req, res) => {
    conn.query(`select * from tbl_transaksi where username = '${req.params.username}'`, (err, rows) => {
        if (err) res.status(400).json(err), console.log(err)
        else res.status(200).json(rows)
    })
})

// Tampil Detail Transaksi
app.get('/transaksi/detail/:nomorTransaksi', (req, res) => {
    conn.query(`select * from tbl_transaksi where no_transaksi = '${req.params.nomorTransaksi}'`, (err, rows) => {
        if (rows[0].namaTransaksi == 'Tarik Saldo') {
            conn.query(`select tbl_transaksi.* , tbl_bank.noRek, tbl_bank.nasabah, tbl_bank.nama_bank from tbl_transaksi INNER JOIN tbl_bank on tbl_transaksi.nomor = tbl_bank.noRek where no_transaksi = '${req.params.nomorTransaksi}'`, (err, rows) => {
                if (err) res.status(400).json(err), console.log(err)
                else res.status(200).json(rows), console.log(rows)
            })
        } else {
            if (err) res.status(400).json(err), console.log(err)
            else res.status(200).json(rows), console.log(rows)
        }
    })
})



// Tambah Penghuni
app.post('/penghuni/add', (req, res) => {
    var { idHunian, idKamar, usernamePenghuni, namaPenghuni, nama_hunian, pemilik, nama_kamar, jangkaWaktu, tgl_masuk, tgl_keluar, tgl_pembayaran, statusPembayaran, no_transaksi } = req.body

    conn.query(`INSERT INTO tbl_penghuni VALUES('','${idHunian}','${idKamar}','${usernamePenghuni}','${namaPenghuni}','${nama_hunian}','${pemilik}','${nama_kamar}','${jangkaWaktu}','${tgl_masuk}','${tgl_keluar}','${tgl_pembayaran}','${statusPembayaran}', '${no_transaksi}')`, (err, rows) => {

        if (err) {
            res.status(500).json(err)
        } else {
            conn.query(`select currentPerson, maxPerson from tbl_kamar WHERE idHunian = '${idHunian}' AND idkamar = '${idKamar}'`, (err, rows) => {
                if (err) {
                    res.status(500).json(err), console.log(err)
                }
                else {
                    if (statusPembayaran === 'Pending') {
                        console.log('Status Pembayaran Pending')
                    } else {
                        var updatePerson = parseInt(rows[0].currentPerson) + parseInt(1)
                        var maxPerson = rows[0].maxPerson

                        if (parseInt(updatePerson) === parseInt(maxPerson)) {

                            conn.query(`UPDATE tbl_kamar SET currentPerson = '${updatePerson}' , status = 'Full' WHERE idHunian = '${idHunian}' AND idkamar = '${idKamar}'`, (err, rows) => {

                                if (err) res.status(400).json(err), console.log(err)
                                else res.status(200).json(rows)
                            })

                        } else {
                            conn.query(`UPDATE tbl_kamar SET currentPerson = '${updatePerson}' WHERE idHunian = '${idHunian}' AND idkamar = '${idKamar}'`, (err, rows) => {

                                if (err) res.status(400).json(err), console.log(err)
                                else res.status(200).json(rows)
                            })
                        }
                    }
                }

            })
        }
    })
})


// Penghuni Berhenti 
app.delete('/hunian/penghuni/:usernamePenghuni/:nama_hunian/:pemilik/:nama_kamar', (req, res) => {
    conn.query(`delete from tbl_penghuni where usernamePenghuni='${req.params.usernamePenghuni}'`, (err, rows) => {
        conn.query(`select currentPerson, maxPerson from tbl_kamar WHERE nama_hunian = '${req.params.nama_hunian}' AND pemilik = '${req.params.pemilik}' AND nama_kamar = '${req.params.nama_kamar}'`, (err, rows) => {
            var updatePerson = parseInt(rows[0].currentPerson) - parseInt(1)
            console.log(updatePerson)
            conn.query(`UPDATE tbl_kamar SET currentPerson = '${updatePerson}', status='Kosong' WHERE nama_hunian = '${req.params.nama_hunian}' AND pemilik = '${req.params.pemilik}' AND nama_kamar = '${req.params.nama_kamar}'`, (err, rows) => {
                if (err) res.status(400).json(err), console.log(err)
                else { res.status(200).json(rows), console.log('Berhasil Berhenti') }
            })
        })
    })
})


// Penghuni Update Status
app.put('/penghuni/update/:id', (req, res) => {
    const { idHunian, idKamar, no_transaksi } = req.query
    conn.query(`UPDATE tbl_penghuni SET statusPembayaran = '${req.body.statusPembayaran}' WHERE id = '${req.params.id}'`, (err, rows) => {
        if (err) {
            res.status(500).json(err)
        }
        else {
            conn.query(`UPDATE tbl_transaksi SET status = '${req.body.statusPembayaran}' WHERE no_transaksi = '${no_transaksi}'`, (err, rows) => {
                if (err) {
                    res.status(500).json(err)
                }
                else {
                    conn.query(`select currentPerson, maxPerson from tbl_kamar WHERE idHunian = '${idHunian}' AND idkamar = '${idKamar}'`, (err, rows) => {
                        if (err) {
                            res.status(500).json(err), console.log(err)
                        }
                        else {
                            var updatePerson = parseInt(rows[0].currentPerson) + parseInt(1)
                            var maxPerson = rows[0].maxPerson

                            if (parseInt(updatePerson) === parseInt(maxPerson)) {

                                conn.query(`UPDATE tbl_kamar SET currentPerson = '${updatePerson}' , status = 'Full' WHERE idHunian = '${idHunian}' AND idkamar = '${idKamar}'`, (err, rows) => {

                                    if (err) res.status(400).json(err), console.log(err)
                                    else res.status(200).json(rows)
                                })

                            } else {
                                conn.query(`UPDATE tbl_kamar SET currentPerson = '${updatePerson}' WHERE idHunian = '${idHunian}' AND idkamar = '${idKamar}'`, (err, rows) => {

                                    if (err) res.status(400).json(err), console.log(err)
                                    else res.status(200).json(rows)
                                })
                            }
                        }

                    })
                }
            })
        }
    })
})


app.put('/penghuni/tagihan/update/:id', (req, res) => {
    const { tgl_masuk, tgl_keluar, tgl_pembayaran, statusPembayaran, no_transaksi } = req.body
    console.log(req.body)
    conn.query(`UPDATE tbl_penghuni SET statusPembayaran = '${statusPembayaran}', tgl_masuk='${tgl_masuk}' , tgl_keluar='${tgl_keluar}' , tgl_pembayaran='${tgl_pembayaran}', no_transaksi='${no_transaksi}' WHERE id = '${req.params.id}'`, (err, rows) => {
        if (err) {
            res.status(500).json(err)
        }
        else {
            res.status(200).json(rows), console.log('Berhasil Update Tagihan')
        }
    })
})


app.put('/penghuni/status/update/:id', (req, res) => {
    conn.query(`UPDATE tbl_penghuni SET statusPembayaran = '${req.body.statusPembayaran}' WHERE id = '${req.params.id}'`, (err, rows) => {
        if (err) {
            res.status(500).json(err)
        } else {
            res.status(200).json({ message: 'Berhasil Update' }), console.log('success')
        }
    })
})

// Tambah Laporan Masalah
app.post('/laporan/masalah/add', (req, res) => {
    var { idHunian, idKamar, idReport, usernamePenghuni, usernamePemilik, nama_hunian, namaPemilik, nama_kamar, masalah, deskripsi, date_create, date_proses, statusReport, namaPenghuni, poto } = req.body

    conn.query(`insert into tbl_masalah values('','${idHunian}','${idKamar}','${idReport}', '${usernamePenghuni}','${usernamePemilik}','${nama_hunian}','${namaPemilik}','${nama_kamar}', '${masalah}', '${deskripsi}','${date_create}','${date_proses}','${statusReport}','${namaPenghuni}','')`, (err, rows) => {
        if (err) res.status(500).json({ message: 'Gagal Mengirimkan Laporan' }), console.log(err)
        else { res.status(200).json(rows), console.log('Berhasil Ditambahkan') }
    })
})

// Tambah Foto Laporan Masalah
app.post('/uploadFoto/:nama_hunian/:pemilik', (req, res) => {
    if (req.body.poto == '') {
        var filename = ''
    } else {
        var poto = req.body.poto
        var masalah = req.body.masalah
        var d = Date.now();
        var filename = masalah + '_' + d + '_IMAGE.jpg';

        var binaryData = new Buffer(poto, 'base64').toString('binary')
        // console.log('Test - ' , binaryData)
        fs.writeFile(__dirname + '/images/masalah/' + filename, binaryData, 'binary',
            (err) => {
                if (err) res.status(400).json(err)
                else res.status(200).json({ message: 'success' }), console.log('Success')
            })
    }

    conn.query(`UPDATE tbl_masalah SET poto = '${filename}' WHERE nama_hunian='${req.params.nama_hunian}' and namaPemilik='${req.params.pemilik}'`)
})

// Tampilkan Laporan Masalah
app.get('/laporan/masalah/list/:jenis/:username', (req, res) => {
    if (req.params.jenis === 'Pemilik') {
        conn.query(`select * from tbl_masalah where usernamePemilik='${req.params.username}' ORDER by id DESC`, (err, rows) => {
            if (err) res.status(500).json(err)
            else { res.status(200).json(rows), console.log('List Pemilik Done !!!') }
        })
    } else if (req.params.jenis === 'Penghuni') {
        conn.query(`select * from tbl_masalah where usernamePenghuni='${req.params.username}' ORDER by id DESC`, (err, rows) => {
            if (err) res.status(500).json(err)
            else { res.status(200).json(rows), console.log('List Penghuni Done !!!') }
        })
    }
})

// Update Status Masalah
app.put('/update/laporan/masalah/:id', (req, res) => {
    console.log(req.body.statusReport)
    console.log(req.params.idReport)
    conn.query(`update tbl_masalah set statusReport='${req.body.statusReport}' where id='${req.params.id}'`, (err, rows) => {
        if (err) res.status(500).json(err)
        else { res.status(200).json(rows), console.log('Update Done !!!') }
    })
})


// Add ShareRoom
app.post('/shareroom/add', (req, res) => {
    // console.log(req.body)
    conn.query(`select * from tbl_user where username ='${req.body.usernameDiundang}'`, (err, rows) => {
        if (err) { res.status(500).json(err), console.log(err) }
        else {
            if (rows[0] === undefined || rows[0].username !== req.body.usernameDiundang) {
                res.json({ message: 'Username Tidak Ditemukan' })
            } else if (rows[0].rows === 'Pemilik' || rows[0].rows === 'Admin') {
                res.json({ message: 'Gagal Undang Username ' + req.body.usernameDiundang })
            } else
            // (req.body.usernameDiundang === rows[0].username && rows[0].jenis !== 'Admin' || rows[0].jenis !== 'Pemilik' ) 
            {
                var data = rows[0]
                var { idHunian, idKamar, usernamePemilik, usernamePengirim, date_create, time, nama_hunian, nama_kamar, deskripsi, statusPermintaan } = req.body
                conn.query(`insert into tbl_shareroom values('','${idHunian}','${idKamar}','${usernamePengirim}','${data.username}','${usernamePemilik}','${data.nama}','${date_create}','${time}','${nama_hunian}','${nama_kamar}','${deskripsi}','${statusPermintaan}')`, (err, rows) => {
                    if (err) res.status(500).json(err), console.log(err)
                    else { res.status(200).json({ message: 'Berhasil Melakukan ShareRoom', data: data }), console.log('Berhasil') }
                })
            }
        }
    })
})


// List ShareRoom
app.get('/shareroom/list/:jenis/:username', (req, res) => {
    if (req.params.jenis === 'Penghuni') {
        conn.query(`select * from tbl_shareroom where usernamePengirim ='${req.params.username}'`, (err, rows) => {
            if (err) res.status(500).json({ message: 'Gagal Mendapatkan Data' })
            else res.status(200).json(rows)
        })
    } else if (req.params.jenis === 'Pemilik') {
        conn.query(`select * from tbl_shareroom where usernamePemilik ='${req.params.username}'`, (err, rows) => {
            if (err) res.status(500).json({ message: 'Gagal Mendapatkan Data' })
            else res.status(200).json(rows)
        })
    }
})


// update status ShareRoom
app.put('/shareroom/update/:id', (req, res) => {
    conn.query(`update tbl_shareroom set statusPermintaan='${req.body.statusPermintaan}' where id='${req.params.id}'`, (err, rows) => {
        if (err) res.status(500).json({ message: 'Gagal Update' })
        else { res.status(200).json({ message: 'Berhasil Update' }), console.log('Berhasil Update Status') }
    })
})

// List Tempat Hunian Penghuni
app.get('/penghuni/:username', (req, res) => {
    conn.query(`SELECT tbl_penghuni.id,  tbl_penghuni.no_transaksi, tbl_penghuni.idHunian,tbl_penghuni.idKamar,tbl_penghuni.usernamePenghuni, tbl_hunian.username as usernamePemilik ,tbl_penghuni.namaPenghuni, tbl_penghuni.nama_hunian, tbl_penghuni.pemilik, tbl_penghuni.nama_kamar, tbl_penghuni.jangkaWaktu, tbl_penghuni.tgl_masuk, tbl_penghuni.tgl_keluar, tbl_penghuni.tgl_pembayaran, tbl_penghuni.statusPembayaran, tbl_hunian.tel, tbl_hunian.alamat_hunian , tbl_hunian.harga_hunian_day, tbl_hunian.harga_hunian_week, tbl_hunian.harga_hunian_month, tbl_hunian.harga_hunian_year FROM tbl_penghuni INNER JOIN tbl_hunian ON  tbl_hunian.nm_hunian = tbl_penghuni.nama_hunian WHERE usernamePenghuni = '${req.params.username}'`, (err, rows) => {
        if (err) res.status(400).json(err)
        else res.status(200).json(rows[0])
    })
})


// List Penghuni Kamar ( Penyedia )
app.get('/penghuni/list/:idHunian/:pemilik/:nama_kamar', (req, res) => {
    conn.query(`SELECT p.usernamePenghuni, p.namaPenghuni, p.nama_hunian, p.pemilik, p.nama_kamar, p.jangkaWaktu, p.tgl_masuk, p.tgl_keluar, p.tgl_pembayaran, p.statusPembayaran , p.no_transaksi , u.poto FROM tbl_penghuni AS p JOIN tbl_user AS u ON usernamePenghuni = u.username WHERE idHunian = '${req.params.idHunian}' AND pemilik = '${req.params.pemilik}' AND nama_kamar = '${req.params.nama_kamar}'`, (err, rows) => {
        if (err) res.status(400).json(err), console.log(err)
        else res.status(200).json(rows)
    })
})


// Tampilkan Semua Penghuni
app.get('/penghuni/list/:idHunian/:pemilik', (req, res) => {
    conn.query(`SELECT p.usernamePenghuni, p.namaPenghuni, p.nama_hunian, p.pemilik, p.nama_kamar, p.jangkaWaktu, p.tgl_masuk, p.tgl_keluar, p.tgl_pembayaran, p.statusPembayaran , p.no_transaksi , u.poto FROM tbl_penghuni AS p JOIN tbl_user AS u ON usernamePenghuni = u.username WHERE idHunian = '${req.params.idHunian}' AND pemilik = '${req.params.pemilik}'`, (err, rows) => {
        if (err) res.status(400).json(err), console.log(err)
        else res.status(200).json(rows)
    })
})

// Tampil Konfirmasi Penghuni
app.get(`/penghuni/detail/:no_transaksi`, (req, res) => {
    console.log(req.params)
    conn.query(`select * from tbl_transaksi where no_transaksi = '${req.params.no_transaksi}'`, (err, rows) => {
        if (err) res.status(400).json(err)
        else {
            var transaksi = rows[0]
            conn.query(`select * from tbl_penghuni where no_transaksi = '${req.params.no_transaksi}'`, (err, rows) => {
                if (err) res.status(400).json(err)
                else res.status(200).json({ transaksi: transaksi, penghuni: rows })
            })
        }
    })
})

// List Penghuni Berdasarkan Status Pembayaran
app.get('/penghuni/listPembayaran/:idHunian/:pemilik', (req, res) => {
    console.log(req.params)
    conn.query(`SELECT p.usernamePenghuni, p.namaPenghuni, p.nama_hunian, p.pemilik, p.nama_kamar, p.jangkaWaktu, p.tgl_masuk, p.tgl_keluar, p.tgl_pembayaran, p.statusPembayaran , p.no_transaksi , u.poto FROM tbl_penghuni AS p JOIN tbl_user AS u ON usernamePenghuni = u.username WHERE idHunian = '${req.params.idHunian}' AND pemilik = '${req.params.pemilik}'`, (err, rows) => {
        if (err) res.status(400).json(err), console.log(err)
        else res.status(200).json(rows)
    })
})



// Tambah Hunian
app.post('/hunian/add', (req, res) => {
    var { namaHunian, username, pemilik, tel, alamatHunian, tipeHunian, jenisListrik, penghuni, pet, luasKamar, jlhLantai, jlhKM, fasilitasHunian, hargaHunianDay, hargaHunianWeek, hargaHunianMonth, hargaHunianYear, denda, poto, deskripsi, lat, long, kota, poto360, datePost } = req.body
    var queryStr = `INSERT INTO tbl_hunian VALUES ('', '${namaHunian}', '${username}','${pemilik}','${tel}','${alamatHunian}','${tipeHunian}', '${penghuni}','${pet}','${luasKamar}','${jenisListrik}','${jlhLantai}','${jlhKM}', '${fasilitasHunian}','${hargaHunianDay}' ,'${hargaHunianWeek}' ,'${hargaHunianMonth}' ,'${hargaHunianYear}' ,'${denda}','${poto}', '${deskripsi}', '${lat}', '${long}','${kota}' , '' ,'${datePost}')`;
    conn.query(queryStr, (err, rows) => {
        if (err) res.status(400).json(err), console.log(err)
        else res.status(200).json({ idHunian: rows.insertId })
    })
})


// Upload Poto Hunian
app.post('/hunian/uploadPhoto/:idHunian', upload.array('images'), (req, res) => {
    console.log('Photo From Server ', req.query.photoFromServer, ' Test ')
    console.log(req.files)
    var test = ''
    if (req.files == undefined || !req.files) {
        test = `${req.query.photoFromServer}`
        console.log('Server')
    } else
        if (req.query.photoFromServer !== '' && req.query.photoFromServer && req.query.photoFromServer !== 'undefined' && req.query.photoFromServer !== null) {
            var Imagelist = [];
            for (var i = 0; i < req.files.length; i++) {
                Imagelist.push([req.files[i].filename])
            }
            var joinArray = Imagelist.join()
            var testLagi = joinArray.split(',')
            var uniqueData = [...new Set(testLagi)];
            test = `${req.query.photoFromServer},${joinArray}`
            console.log('Server Dan Galeri')
        } else {
            var Imagelist = [];
            for (var i = 0; i < req.files.length; i++) {
                Imagelist.push([req.files[i].filename])
            }
            var joinArray = Imagelist.join()
            var testLagi = joinArray.split(',')
            var uniqueData = [...new Set(testLagi)];
            test = `${joinArray}`
            console.log('Galeri')
        }
    console.log(test)
    conn.query(`UPDATE tbl_hunian SET poto = '${test}' WHERE idHunian='${req.params.idHunian}'`, (err, rows) => {
        console.log(req.params.idHunian)
    })
    res.status(200).json({ message: 'Berhasil' }), console.log('Upload Done')
})


// Upload Poto 360
app.post('/ulasan/uploadPoto/360/:idHunian', (req, res) => {
    var poto = req.body.poto
    var d = Date.now();
    var filename = d + '_IMAGE.jpg';

    var binaryData = new Buffer(poto, 'base64').toString('binary')
    // console.log('Test - ' , binaryData)
    fs.writeFile(__dirname + '/images/hunian/360/' + filename, binaryData, 'binary',
        (err) => {
            if (err) res.status(400).json(err)
            else { res.status(200).json({ message: 'success 360' }) }
        })
    conn.query(`UPDATE tbl_hunian SET poto360 = '${filename}' WHERE idHunian='${req.params.idHunian}'`)
})

// Delete Hunian
app.delete('/hunian/delete/:idHunian', (req, res) => {
    conn.query(`delete from tbl_hunian where idHunian='${req.params.idHunian}'`, (err, rows) => {
        if (err) res.status(400).json(err), console.log(err)
        else res.status(200).json(rows)
    })
})



// Hapus Kamar
app.delete('/kamar/delete/:idKamar', (req, res) => {
    conn.query(`delete from tbl_kamar where idKamar='${req.params.idKamar}'`, (err, rows) => {
        if (err) res.status(400).json(err), console.log(err)
        else res.status(200).json(rows)
    })
})


// Detail Kamar
app.get('/kamar/list/:idKamar', (req, res) => {
    conn.query(`select * from tbl_kamar where idKamar='${req.params.idKamar}'`, (err, rows) => {
        if (err) res.status(400).json(err), console.log(err)
        else res.status(200).json(rows)
    })
})


// Edit Kamar
app.put('/kamar/edit/:idKamar', (req, res) => {
    const { no_kamar, nama_kamar, lokasi_kamar, maxPerson, namaFasilitas } = req.body
    conn.query(`update tbl_kamar set nama_kamar='${nama_kamar}', no_kamar='${no_kamar}', lokasi_kamar='${lokasi_kamar}',maxPerson=${maxPerson}, nama_fasilitas='${namaFasilitas}' where idKamar='${req.params.idKamar}'`, (err, rows) => {
        if (err) res.status(500).json({ message: 'Gagal Ubah Kamar' }), console.log(err)
        else res.status(200).json({ message: 'Kamar Berhasil Diubah' })
    })
})

// Tambah Kamar
app.post('/kamar/add', (req, res) => {
    const { idHunian, no_kamar, nama_hunian, pemilik, username, nama, status, nama_kamar, lokasi_kamar, maxPerson, currentPerson, namaFasilitas } = req.body
    var queryStr = `INSERT INTO tbl_kamar  VALUES ('','${idHunian}','${no_kamar}','${nama_kamar}','${nama_hunian}','${pemilik}','${username}','${nama}','${maxPerson}','${currentPerson}','${status}','${namaFasilitas}','${lokasi_kamar}')`;
    conn.query(queryStr, (err, rows) => {
        if (err) res.status(400).json(err), console.log(err)
        else res.status(200).json(rows)
    })
})

// Tampil Fasilitas Kamar dan Hunian 
app.get('/fasilitas/:tipe_fasilitas', (req, res) => {
    conn.query(`SELECT * FROM tbl_fasilitas where tipe_fasilitas = '${req.params.tipe_fasilitas}'`, (err, rows) => {
        if (err) { res.status(500).json(err) }
        else { res.status(200).json(rows) }
    })
})

// Menampilkan Fasilitas Hunian dan Kamar Berdasarkan Nama Hunian
app.get('/:idHunian/kamar', (req, res) => {
    conn.query(`SELECT  k.nama_hunian, h.luasKamar , GROUP_CONCAT(DISTINCT k.nama_fasilitas SEPARATOR ',') AS Fasilitas FROM tbl_kamar AS k INNER JOIN tbl_hunian as h on k.idHunian = h.idHunian JOIN tbl_kamar on k.idHunian = h.idHunian WHERE k.idHunian = '${req.params.idHunian}'`, (err, rows) => {
        if (err) { res.status(500).json(err) }
        else { res.status(200).json(rows[0]) }
    })
})


// Menampilkan Semua Hunian Untuk Dashboard Pemilik Hunian
app.get('/hunian/:username', (req, res) => {
    conn.query(`SELECT * FROM tbl_hunian where username = '${req.params.username}'`, (err, rows) => {
        if (err) { res.status(500).json(err) }
        else { res.status(200).json(rows) }
    })
})

// Menampilkan Detail Hunian
app.get('/hunian/detail/:idHunian', (req, res) => {
    conn.query(`select tbl_hunian.*,tbl_user.poto as userPoto, SUM(tbl_kamar.currentPerson) as statusKamarTerisi ,  SUM(tbl_kamar.maxPerson) as statusKamarMaks , SUM(CASE WHEN tbl_kamar.status = 'Kosong' THEN 1 else 0 end) as kamarTersedia , COUNT(tbl_kamar.nama_kamar) as jumlahKamar  from tbl_hunian JOIN tbl_user on tbl_hunian.username = tbl_user.username JOIN tbl_kamar ON tbl_hunian.idHunian = tbl_kamar.idHunian WHERE tbl_hunian.idHunian = '${req.params.idHunian}'`, (err, rows) => {
        if (err) { res.status(500).json(err), console.log(err) }
        else { res.status(200).json(rows[0]), console.log('Success List') }
    })
})

// Edit Hunian
app.put('/hunian/edit/:idHunian', (req, res) => {
    var { namaHunian, username, pemilik, tel, alamatHunian, tipeHunian, jenisListrik, penghuni, pet, luasKamar, jlhLantai, jlhKM, fasilitasHunian, hargaHunianDay, hargaHunianWeek, hargaHunianMonth, hargaHunianYear, denda, poto, deskripsi, lat, long, datePost } = req.body
    conn.query(`UPDATE tbl_hunian SET nm_hunian='${namaHunian}', username='${username}', pemilik='${pemilik}', tel='${tel}', alamat_hunian='${alamatHunian}', tipe_hunian='${tipeHunian}', penghuni='${penghuni}', jenisListrik='${jenisListrik}', jlhLantai='${jlhLantai}', jlhKM='${jlhKM}', nama_fasilitas='${fasilitasHunian}', harga_hunian_day='${hargaHunianDay}', harga_hunian_week='${hargaHunianWeek}',harga_hunian_month='${hargaHunianMonth}',harga_hunian_year='${hargaHunianYear}', denda='${denda}',deskripsi='${deskripsi}' ,latitude=${lat}, longtitude='${long}' where idHunian=${req.params.idHunian}`, (err, rows) => {
        if (err) { res.status(500).json(err), console.log(err) }
        else { res.status(200).json(rows), console.log('Success Update Hunian') }
    })
})

// Menampilkan Kamar
app.get('/kamar/:idHunian', (req, res) => {
    conn.query(`SELECT * FROM tbl_kamar where idHunian = '${req.params.idHunian}'`, (err, rows) => {
        if (err) { res.status(500).json(err) }
        else { res.status(200).json(rows) }
    })
})



// // Tambah Penghuni

// app.post(`/penghuni/add`, (req, res) => {
//     var { usernamePenghuni, namaPenghuni, nama_hunian, pemilik, nama_kamar, jangkaWaktu, tgl_masuk, tgl_keluar, tgl_pembayaran, statusPembayaran, no_transaksi } = req.body
//     // conn.query(`insert into tbl_penghuni values ('','${usernamePenghuni}','${namaPenghuni}', '${nama_hunian}','${pemilik}','${nama_kamar}','${jangkaWaktu}', '${tgl_masuk}', '${tgl_keluar}', '${tgl_pembayaran}','${statusPembayaran}','${no_transaksi}')`, (err, rows) => {
//     //     if (err) res.status(500).json(err)
//     //     else res.status(200).json(rows)
//     // })
//     console.log(req.body)
// })



// Menampilkan Semua Hunian Penghuni / Calon Penghuni

app.get('/hunian', (req, res) => {
    conn.query(`select tbl_hunian.*,tbl_user.poto as userPoto, SUM(tbl_kamar.currentPerson) as statusKamarTerisi ,  SUM(tbl_kamar.maxPerson) as statusKamarMaks , SUM(CASE WHEN tbl_kamar.status = 'Kosong' THEN 1 else 0 end) as kamarTersedia , COUNT(tbl_kamar.nama_kamar) as jumlahKamar  from tbl_hunian JOIN tbl_user on tbl_hunian.username = tbl_user.username JOIN tbl_kamar ON tbl_hunian.idHunian = tbl_kamar.idHunian GROUP BY tbl_hunian.nm_hunian order by idHunian DESC`, (err, rows) => {
        if (err) { res.status(500).json(err) }
        else { res.status(200).json(rows) }

    })
})




// Chat
// Tambah Chat
app.post('/Chat/add', (req, res) => {
    const { idHunian, chatId, usernamePemilik, usernamePenghuni, usernameSend, jenis, nama, pemilik, namaHunian, message, date, time, status } = req.body
    var queryStr = `INSERT INTO tbl_chat VALUES ('','${idHunian}','${chatId}' ,'${usernamePenghuni}','${usernamePemilik}','${usernameSend}','${jenis}', '${nama}','${pemilik}', '${namaHunian}','${message}', '${date}','${time}','${status}')`;
    conn.query(queryStr, (err, rows) => {
        if (err) { res.status(400).json(err), console.log('Gagal Ditambahkan', err) }
        else { res.status(200).json(rows), console.log('Berhasil Ditambahkan') }
    })
})

// List Chat Berdasarkan Role ( Penghuni Atau Pemilik )
app.get('/Chat/:jenis/:username', (req, res) => {
    if (req.params.jenis === 'Penghuni') {
        conn.query(`SELECT tbl_chat.*, tbl_user.poto FROM tbl_chat INNER JOIN tbl_user ON tbl_user.username = tbl_chat.usernamePemilik WHERE tbl_chat.id IN (SELECT MAX(tbl_chat.id) FROM tbl_chat WHERE usernamePenghuni = '${req.params.username}'  GROUP BY nama_hunian)`, (err, rows) => {
            if (err) { res.status(500).json(err) }
            else res.status(200).json(rows)
        })
    } else if (req.params.jenis === 'Pemilik') {
        conn.query(`SELECT tbl_chat.*, tbl_user.poto FROM tbl_chat INNER JOIN tbl_user ON tbl_user.username = tbl_chat.usernamePenghuni WHERE tbl_chat.id IN (SELECT MAX(tbl_chat.id) FROM tbl_chat WHERE usernamePemilik = '${req.params.username}'  GROUP BY nama_hunian,nama)`, (err, rows) => {
            if (err) { res.status(500).json(err) }
            else res.status(200).json(rows)
        })
    }
})

// Delete Chat
app.delete('/chat/delete/:chat_id', (req, res) => {
    conn.query(`delete from tbl_chat where chat_id='${req.params.chat_id}'`, (err, rows) => {
        if (err) { res.status(500).json(err) }
        else { res.status(200).json(rows), console.log('Delete Pesan Berhasil') }
    })
})

// Update Status chat
app.put('/chat/update/status/:chat_id', (req, res) => {
    conn.query(`update tbl_chat set status='${req.body.status}' where chat_id='${req.params.chat_id}'`, (err, rows) => {
        if (err) res.status(500).json({ message: 'Gagal Update Chat' })
        else res.status(200).json({ message: 'Berhasil Update Chat' })
    })
})

// Detail Chat
app.get('/Chat/detail/:idHunian/:chat_id/:usernamePemilik', (req, res) => {
    conn.query(`SELECT * FROM tbl_chat WHERE idHunian='${req.params.idHunian}' and chat_id = '${req.params.chat_id}' and usernamePemilik = '${req.params.usernamePemilik}'`, (err, rows) => {
        if (err) { res.status(500).json(err) }
        else { res.status(200).json(rows) }
    })
})

// Get Unread Chat
app.get('/unread/chat/count/chat_id/:username', (req, res) => {
    if (req.query.jenis === 'Penghuni') {
        conn.query(`SELECT SUM(CASE WHEN status = 'unread' THEN 1 ELSE 0 END) as unread FROM tbl_chat WHERE usernamePenghuni = '${req.params.username}' and chat_id='${req.query.chat_id}' GROUP BY chat_id`, (err, rows) => {
            if (err) { res.status(500).json(err) }
            else res.status(200).json(rows), console.log(rows)
        })
    } else if (req.query.jenis === 'Pemilik') {
        conn.query(`SELECT SUM(CASE WHEN status = 'unread' THEN 1 ELSE 0 END) as unread FROM tbl_chat WHERE usernamePemilik = '${req.params.username}' and chat_id=${req.query.chat_id} GROUP BY chat_id`, (err, rows) => {
            if (err) { res.status(500).json(err), console.log(err) }
            else res.status(200).json(rows), console.log(rows)
        })
    } else if (req.query.jenis === 'Admin') {
        conn.query(`SELECT SUM(CASE WHEN status = 'unread' THEN 1 ELSE 0 END) as unread FROM tbl_livechat WHERE usernameAdmin = '${req.params.username}' and idChat=${req.query.idChat} GROUP BY idChat`, (err, rows) => {
            if (err) { res.status(500).json(err), console.log(err) }
            else res.status(200).json(rows), console.log(rows)
        })
    }
})

// List dan Detail Chat Penghuni

// app.get('/Chat/:pemilik/:hunian/:nama', (req, res) => {
//     conn.query(`select * from tbl_chat where pemilik ='${req.params.pemilik}' and nama_hunian = '${req.params.hunian}' and nama = '${req.params.nama}'`, (err, rows) => {
//         if (err) { res.status(500).json(err) }
//         else res.status(200).json(rows)
//     })
// })

app.get('/Chat/list/penghuni/:username', (req, res) => {
    console.log(req.params.username)
    conn.query(`SELECT tbl_chat.*, tbl_user.poto FROM tbl_chat INNER JOIN tbl_user ON tbl_user.username = tbl_chat.usernameReceive WHERE tbl_chat.id IN (SELECT MAX(tbl_chat.id) FROM tbl_chat WHERE usernameSend = '${req.params.username}'  GROUP BY nama_hunian)`, (err, rows) => {
        if (err) { res.status(500).json(err), console.log('Gagal List Chat') }
        else { res.status(200).json(rows), console.log('Berhasil List Chat') }
    })
})


// Ulasan

// Tambah Ulasan

app.post('/Ulasan/add', (req, res) => {

    const { idUlasan, idHunian, username, nama, jenis, ulasan, date, starFasilitas, starHarga, starKeamanan, starKebersihan, starKenyamanan } = req.body
    var queryStr = `INSERT INTO tbl_ulasan VALUES ('','${idUlasan}','${idHunian}','${username}','${nama}','${jenis}','${ulasan}','','${date}','${starFasilitas}','${starHarga}','${starKeamanan}','${starKebersihan}','${starKenyamanan}')`;
    conn.query(queryStr, (err, rows) => {
        if (err) res.status(400).json(err), console.log(err)
        else res.status(200).json(rows)
    })
})

// Upload Foto Ulasan
app.post('/ulasan/uploadPoto/:idUlasan', (req, res) => {
    var poto = req.body.poto
    var d = Date.now();
    var filename = d + '_IMAGE.jpg';

    var binaryData = new Buffer(poto, 'base64').toString('binary')
    // console.log('Test - ' , binaryData)
    fs.writeFile(__dirname + '/images/ulasan/' + filename, binaryData, 'binary',
        (err) => {
            if (err) res.status(400).json(err)
            else { res.status(200).json({ message: 'success' }) }
        })
    conn.query(`UPDATE tbl_ulasan SET poto = '${filename}' WHERE idUlasan='${req.params.idUlasan}'`)
})

// Tampilkan Ulasan
app.get('/Ulasan/:idHunian', (req, res) => {
    conn.query(`SELECT * FROM tbl_ulasan WHERE idHunian='${req.params.idHunian}'`, (err, rows) => {
        if (err) res.status(400).json(err), console.log(err)
        else res.status(200).json(rows) // Send Hasil Query Ke Client Side
    })
})


app.get('/notifikasi/count/:username', (req, res) => {

    conn.query(`SELECT SUM(CASE WHEN read_at = 'unseen' THEN 1 ELSE 0 END) as unseen FROM tbl_notifikasi WHERE username = '${req.params.username}'`, (err, rows) => {
        if (err) res.status(400).json(err), console.log(err)
        else res.status(200).json(rows)
    })
})

app.get('/chat/count/unread/:username', (req, res) => {
    var queryStr = ''
    if (req.query.jenis == 'Pemilik') {
        queryStr = `SELECT SUM(CASE WHEN status = 'unread' THEN 1 ELSE 0 END) as unread FROM tbl_chat WHERE usernamePemilik = '${req.params.username}'`
    } else if (req.query.jenis == 'Penghuni') {
        queryStr = `SELECT SUM(CASE WHEN status = 'unread' THEN 1 ELSE 0 END) as unread FROM tbl_chat WHERE usernamePenghuni = '${req.params.username}'`
    }
    conn.query(queryStr, (err, rows) => {
        if (err) res.status(400).json(err), console.log(err)
        else res.status(200).json(rows)
    })
})


// Wishlist

// Tambah Wishlist
app.post('/wishlist/add', (req, res) => {
    conn.query(`insert into tbl_wishlist values('','${req.body.username}','${req.body.idHunian}')`, (err, rows) => {
        if (err) res.status(500).json({ message: 'Gagal Menambahkan Wishlist' })
        else res.status(200).json({ message: 'Berhasil Menambahkan Wishlist' })
    })
})


// Check Wishlist
app.get('/wishlist/check', (req, res) => {
    conn.query(`select * from tbl_wishlist where idHunian='${req.query.idHunian}' and username='${req.query.username}'`, (err, rows) => {
        res.status(200).json(rows)
    })
})


// List WishList
app.get('/wishlist/list', (req, res) => {
    conn.query(`select * from tbl_wishlist where username='${req.query.username}'`, (err, rows) => {
        if (err) res.status(500).json({ message: 'Gagal Mendapatkan List WishList' }), console.log(err)
        else res.status(200).json(rows)
    })
})

app.delete('/wishlist/delete', (req, res) => {
    conn.query(`delete from tbl_wishlist where idHunian='${req.query.idHunian}' and username='${req.query.username}'`, (err, rows) => {
        res.status(200).json(rows)
    })
})


// Forget Password
app.post('/password/forget', (req, res) => {
    const email = req.body.email
    conn.query(`select username from tbl_user where email='${email}'`, async (err, rows) => {
        if (err) res.status(500).json({ message: 'Email Tidak Terdaftar' }), console.log(err)
        else {
            if (rows.length == 0 || rows == []) {
                res.send({ message: 'Email Tidak Terdaftar' })
                console.log('Email Tidak Terdaftar')
            } else if (rows.length !== 0 || rows !== []) {
                const username = rows[0].username
                var payload = {
                    username: rows[0].username,
                }
                var token = jwt.sign(payload, secret_key, { expiresIn: '1h' })

                var transporter = nodemailer.createTransport({
                    service: 'gmail',
                    secure: false,
                    auth: {
                        user: 'help.center.homie@gmail.com',
                        pass: 'Homie123'
                    }
                });



                // // Save reset_key dan request time ke db
                // await User.findByIdAndUpdate(_id, {
                //   $set: { reset_key, reset_request_time: new Date() },
                // });
                const reset_key = token
                const link = `http://192.168.100.4:3000/reset-password/${reset_key}/${username}`;
                const from = 'Homie Help <help.center.homie@gmail.com>';
                const to = email;
                const subject = 'Permintaan Reset Password';

                const text = `Kami menerima permintaan reset password dari akun Anda. Jika Anda merasa tidak pernah melakukan permintaan reset password, abaikan email ini. Klik link berikut untuk melakukan reset password ${link}`;

                const html = `
                      <p>Kami menerima permintaan reset password dari akun yang terhubung ke email ini.</p>
                      <p>Anda bisa melakukan reset password melalui link di bawah ini yang akan valid sampai 1 jam ke depan.</p><br />
                      <a href="${link}" style="background-color: #24A1D7; color: #fff; padding: 15px 20px; border-radius: 5px; font-weight: bold; cursor: pointer; user-select: none; text-decoration: none;" target="_blank" rel="noopener noreferrer">Reset Password</a><br /><br />
                      <p>Jika Anda tidak melakukan permintaan reset password, silahkan abaikan email ini.</p>
                      <p>Terima kasih</p>
                    `;



                const options = { from, to, subject, text, html };
                transporter.sendMail(options, function (err, info) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('Email sent: ' + info.response);
                    }
                });
                transporter.close();
                res.status(200).json({ message: 'Link Reset Password Berhasil Terkirim' })
            }
        }
    })
})


// Filter Hunian
app.get('/home/hunian/filter', (req, res) => {
    // const kota = req.query.kota
    const getNamaFasilitas = req.query.namaFasilitas.split(',')
    var test = getNamaFasilitas.map(function (e, i) {
        return e.replace('%20', ' ')
    })
    const tipeAkomodasi = req.query.tipeAkomodasi
    const harga = req.query.harga
    const namaFasilitas = test.join()
    const jenis_penghuni = req.query.jk

    const queryFull = `SELECT tbl_hunian.* FROM tbl_hunian JOIN tbl_kamar ON tbl_hunian.idHunian = tbl_kamar.idHunian WHERE CONCAT(tbl_hunian.nama_fasilitas ,',',tbl_kamar.nama_fasilitas) LIKE '${namaFasilitas}' AND harga_hunian_month BETWEEN '0' AND '${harga}' AND tipe_hunian='${tipeAkomodasi}' AND penghuni='${jenis_penghuni}' GROUP BY tbl_hunian.idHunian`

    const queryFilterHarga = `SELECT * FROM tbl_hunian JOIN tbl_kamar ON tbl_hunian.idHunian = tbl_kamar.idHunian WHERE harga_hunian_month BETWEEN '0' AND '${harga}' GROUP BY tbl_hunian.idHunian`

    const queryNamaFasilitas = `SELECT tbl_hunian.* FROM tbl_hunian JOIN tbl_kamar ON tbl_hunian.idHunian = tbl_kamar.idHunian WHERE CONCAT(tbl_hunian.nama_fasilitas ,',',tbl_kamar.nama_fasilitas) LIKE '${namaFasilitas}' GROUP BY tbl_hunian.idHunian`

    const queryTipeAkomodasi = `SELECT tbl_hunian.* FROM tbl_hunian JOIN tbl_kamar ON tbl_hunian.idHunian = tbl_kamar.idHunian WHERE tipe_hunian='${tipeAkomodasi}' GROUP BY tbl_hunian.idHunian`

    const queryHargaDanFasilitas = `SELECT * FROM tbl_hunian JOIN tbl_kamar ON tbl_hunian.idHunian = tbl_kamar.idHunian WHERE harga_hunian_month BETWEEN '0' AND '${harga}' AND CONCAT(tbl_hunian.nama_fasilitas ,',',tbl_kamar.nama_fasilitas) LIKE '${namaFasilitas}' GROUP BY tbl_hunian.idHunian`

    const queryHargaDanTipeAkomodasi = `SELECT * FROM tbl_hunian JOIN tbl_kamar ON tbl_hunian.idHunian = tbl_kamar.idHunian WHERE harga_hunian_month BETWEEN '0' AND '${harga}' AND tipe_hunian='${tipeAkomodasi}' GROUP BY tbl_hunian.idHunian `

    const queryFasilitasDanTipeAkomodasi = `SELECT * FROM tbl_hunian JOIN tbl_kamar ON tbl_hunian.idHunian = tbl_kamar.idHunian WHERE CONCAT(tbl_hunian.nama_fasilitas ,',',tbl_kamar.nama_fasilitas) LIKE '${namaFasilitas}'  AND tipe_hunian='${tipeAkomodasi}' GROUP BY tbl_hunian.idHunian `

    const queryJk = `SELECT tbl_hunian.* FROM tbl_hunian JOIN tbl_kamar ON tbl_hunian.idHunian = tbl_kamar.idHunian WHERE penghuni LIKE '${jenis_penghuni}' GROUP BY idHunian`

    const queryJkDanHarga = `SELECT * FROM tbl_hunian JOIN tbl_kamar ON tbl_hunian.idHunian = tbl_kamar.idHunian WHERE harga_hunian_month BETWEEN '0' AND '${harga}' AND penghuni LIKE '${jenis_penghuni}' GROUP BY tbl_hunian.idHunian`

    const queryJkDanFasilitas = `SELECT * FROM tbl_hunian JOIN tbl_kamar ON tbl_hunian.idHunian = tbl_kamar.idHunian WHERE penghuni LIKE '${jenis_penghuni}' AND CONCAT(tbl_hunian.nama_fasilitas ,',',tbl_kamar.nama_fasilitas) LIKE '${namaFasilitas}' GROUP BY tbl_hunian.idHunian`

    const queryJKdanTipeAkomodasi = `SELECT * FROM tbl_hunian JOIN tbl_kamar ON tbl_hunian.idHunian = tbl_kamar.idHunian WHERE penghuni LIKE '${jenis_penghuni}' AND tipe_hunian='${tipeAkomodasi}' GROUP BY tbl_hunian.idHunian`

    const queryJkdanHargadanFasilitas = `SELECT * FROM tbl_hunian JOIN tbl_kamar ON tbl_hunian.idHunian = tbl_kamar.idHunian WHERE harga_hunian_month BETWEEN '0' AND '${harga}' AND penghuni LIKE '${jenis_penghuni}' AND CONCAT(tbl_hunian.nama_fasilitas ,',',tbl_kamar.nama_fasilitas) LIKE '${namaFasilitas}' GROUP BY tbl_hunian.idHunian`

    const queryJkdanHargadanAkomodasi = `SELECT * FROM tbl_hunian JOIN tbl_kamar ON tbl_hunian.idHunian = tbl_kamar.idHunian WHERE harga_hunian_month BETWEEN '0' AND '${harga}' AND penghuni LIKE '${jenis_penghuni}' AND tipe_hunian='${tipeAkomodasi}' GROUP BY tbl_hunian.idHunian`

    const queryJkdanFasilitasDanAkomodasi = `SELECT * FROM tbl_hunian JOIN tbl_kamar ON tbl_hunian.idHunian = tbl_kamar.idHunian WHERE AND tipe_hunian='${tipeAkomodasi}' AND penghuni LIKE '${jenis_penghuni}' AND CONCAT(tbl_hunian.nama_fasilitas ,',',tbl_kamar.nama_fasilitas) LIKE '${namaFasilitas}' GROUP BY tbl_hunian.idHunian`

    if (namaFasilitas !== '' && harga == '0' && !tipeAkomodasi && jenis_penghuni == '') {
        conn.query(queryNamaFasilitas, (err, rows) => {
            if (err) res.status(500).json({ message: 'Gagal List Hunian' }), console.log(err)
            else res.status(200).json(rows)
        })
    } else if (!namaFasilitas && harga !== '0' && !tipeAkomodasi && jenis_penghuni == '') {
        conn.query(queryFilterHarga, (err, rows) => {
            if (err) res.status(500).json({ message: 'Gagal List Hunian' }), console.log(err)
            else res.status(200).json(rows)
        })
    } else if (!namaFasilitas && harga == '0' && tipeAkomodasi !== '' && jenis_penghuni == '') {
        conn.query(queryTipeAkomodasi, (err, rows) => {
            if (err) res.status(500).json({ message: 'Gagal List Hunian' }), console.log(err)
            else res.status(200).json(rows)
        })
    } else if (namaFasilitas && harga !== '0' && !tipeAkomodasi && jenis_penghuni == '') {
        conn.query(queryHargaDanFasilitas, (err, rows) => {
            if (err) res.status(500).json({ message: 'Gagal List Hunian' }), console.log(err)
            else res.status(200).json(rows)
        })
    } else if (!namaFasilitas && harga !== '0' && tipeAkomodasi !== '' && jenis_penghuni == '') {
        conn.query(queryHargaDanTipeAkomodasi, (err, rows) => {
            if (err) res.status(500).json({ message: 'Gagal List Hunian' }), console.log(err)
            else res.status(200).json(rows)
        })
    } else if (namaFasilitas && harga == '0' && tipeAkomodasi !== '' && jenis_penghuni == '') {
        conn.query(queryFasilitasDanTipeAkomodasi, (err, rows) => {
            if (err) res.status(500).json({ message: 'Gagal List Hunian' }), console.log(err)
            else res.status(200).json(rows)
        })
    } else if (!namaFasilitas && harga == '0' && !tipeAkomodasi && jenis_penghuni !== '') {
        conn.query(queryJk, (err, rows) => {
            if (err) res.status(500).json({ message: 'Gagal List Hunian' }), console.log(err)
            else res.status(200).json(rows)
        })
    } else if (!namaFasilitas && harga !== '0' && !tipeAkomodasi && jenis_penghuni !== '') {
        conn.query(queryJkDanHarga, (err, rows) => {
            if (err) res.status(500).json({ message: 'Gagal List Hunian' }), console.log(err)
            else res.status(200).json(rows)
        })
    } else if (namaFasilitas!=='' && harga == '0' && !tipeAkomodasi && jenis_penghuni !== '') {
        conn.query(queryJkDanFasilitas, (err, rows) => {
            if (err) res.status(500).json({ message: 'Gagal List Hunian' }), console.log(err)
            else res.status(200).json(rows)
        })
    } else if (!namaFasilitas && harga == '0' && tipeAkomodasi!=='' && jenis_penghuni !== '') {
        conn.query(queryJKdanTipeAkomodasi, (err, rows) => {
            if (err) res.status(500).json({ message: 'Gagal List Hunian' }), console.log(err)
            else res.status(200).json(rows)
        })
    } else if (namaFasilitas!=='' && harga !== '0' && !tipeAkomodasi && jenis_penghuni !== '') {
        conn.query(queryJkdanHargadanFasilitas, (err, rows) => {
            if (err) res.status(500).json({ message: 'Gagal List Hunian' }), console.log(err)
            else res.status(200).json(rows)
        })
    } else if (!namaFasilitas && harga !== '0' && tipeAkomodasi!=='' && jenis_penghuni !== '') {
        conn.query(queryJkdanHargadanAkomodasi, (err, rows) => {
            if (err) res.status(500).json({ message: 'Gagal List Hunian' }), console.log(err)
            else res.status(200).json(rows)
        })
    } else if (namaFasilitas !=='' && harga == '0' && tipeAkomodasi!=='' && jenis_penghuni !== '') {
        conn.query(queryJkdanFasilitasDanAkomodasi, (err, rows) => {
            if (err) res.status(500).json({ message: 'Gagal List Hunian' }), console.log(err)
            else res.status(200).json(rows)
        })
    }  else if (namaFasilitas && harga !== '0' && tipeAkomodasi) {
        conn.query(queryFull, (err, rows) => {
            if (err) res.status(500).json({ message: 'Gagal List Hunian' }), console.log(err)
            else res.status(200).json(rows)
        })
    }
})


// Sisi Admin

// List User
app.get('/list/user', (req, res) => {
    console.log(req.query.screen)
    if (req.query.screen == 'Laporan User') {
        conn.query(`select * from tbl_user where role <> 'Admin'`, (err, rows) => {
            if (err) res.status(500).json({ message: 'List User Gagal' }), console.log(err)
            else res.status(200).json(rows), console.log('Berhasil List User')
        })
    } else if (req.query.screen == 'Setting') {
        conn.query(`select * from tbl_user where role = 'Admin' AND username <> '${req.query.username}'`, (err, rows) => {
            if (err) res.status(500).json({ message: 'List User Gagal' }), console.log(err)
            else res.status(200).json(rows), console.log('Berhasil List Admin')
        })
    }

})


// Tambah Promo
app.post('/promo/add', (req, res) => {
    const { nama_promo, kode_promo, jenisPromo, tgl_mulai, tgl_akhir, persen, poto, kuota, deskripsi, targetPromo, targetUser } = req.body
    conn.query(`insert into tbl_promo values('','${nama_promo}','${kode_promo}', '${jenisPromo}', '${tgl_mulai}', '${tgl_akhir}','${persen}','','${kuota}','${deskripsi}','${targetPromo}','${targetUser}','')`, (err, rows) => {
        if (err) res.status(500).json({ message: 'Gagal Menambahkan Promo' }), console.log(err)
        else res.status(200).json({ message: 'Promo Berhasil Ditambahkan', idPromo: rows.insertId })
    })
})

app.post('/uploadFoto/add/promo/:idPromo', (req, res) => {
    console.log(req.params.idPromo)
    if (req.body.poto == '') {
        var filename = ''
    } else {
        var poto = req.body.poto
        var d = Date.now();
        var filename = d + '_IMAGE.jpg';

        var binaryData = new Buffer(poto, 'base64').toString('binary')
        // console.log('Test - ' , binaryData)
        fs.writeFile(__dirname + '/images/promo/' + filename, binaryData, 'binary',
            (err) => {
                if (err) res.status(400).json(err)
                else res.status(200).json({ message: 'success' })
            })
    }

    conn.query(`UPDATE tbl_promo SET poto = '${filename}' WHERE id_promo ='${req.params.idPromo}'`)
})

// List Promo

app.get('/promo/list', (req, res) => {
    conn.query(`select * from tbl_promo`, (err, rows) => {
        if (err) res.status(500).json({ message: 'Gagal Mendapatkan Data' }), console.log(err)
        else res.status(200).json(rows)
    })
})


app.put('/promo/edit/:idPromo', (req, res) => {
    const { nama_promo, kode_promo, jenisPromo, tgl_mulai, tgl_akhir, persen, poto, kuota, deskripsi, targetPromo, targetUser } = req.body
    conn.query(`update tbl_promo set nama_promo ='${nama_promo}' , kode_promo ='${kode_promo}', jenisPromo ='${jenisPromo}', tgl_mulai = '${tgl_mulai}' , tgl_akhir ='${tgl_akhir}' , persen = '${persen}', kuota = '${kuota}',deskripsi = '${deskripsi}', targetPromo='${targetPromo}', targetUser='${targetUser}'`, (err, rows) => {
        if (err) res.status(500).json({ message: 'Gagal Edit Promo' }), console.log(err)
        else res.status(200).json({ message: 'Promo Berhasil Di Edit' })
    })
})

app.delete('/promo/delete/:idPromo', (req, res) => {
    conn.query(`delete from tbl_promo where id_promo = '${req.params.idPromo}'`, (err, rows) => {
        if (err) res.status(500).json({ message: 'Promo Gagal DiHapus' }), console.log(err)
        else res.status(200).json({ message: 'Promo Berhasil Dihapus' })
    })
})


app.get('/review/app/list', (req, res) => {
    conn.query(`select * from tbl_review`, (err, rows) => {
        if (err) res.status(500).json({ message: 'Gagal Mendapatkan List' }), console.log(err)
        else res.status(200).json(rows)
    })
})


app.delete('/review/app/delete/:idReview', (req, res) => {
    conn.query(`delete from tbl_review where idReview ='${req.params.idReview}'`, (err, rows) => {
        if (err) res.status(500).json({ message: 'Gagal Menghapus Review' }), console.log(err)
        else res.status(200).json({ message: 'Berhasil Menghapus Review' })
    })
})


app.delete('/delete/user/:username', (req, res) => {
    conn.query(`delete from tbl_user where username='${req.params.username}'`, (err, rows) => {
        if (err) res.status(500).json({ message: 'Gagal Menghapus User' }), console.log(err)
        else res.status(200).json({ message: 'Berhasil Menghapus User' })
    })
})


app.get('/search/:item', (req, res) => {
    var item = req.params.item
    if (item == 'Hunian') {
        conn.query(`select * from tbl_hunian where nm_hunian like '%${req.query.nama_hunian}%' order by idHunian`, (err, rows) => {
            if (!rows || rows.length == 0) {
                conn.query(`select * from tbl_hunian where kota like '%${req.query.nama_hunian}%' order by idHunian`, (err, rows) => {
                    if (err) res.status(500).json({ message: 'Gagal Mencari Hunian Berdasarkan Kota' }), console.log(err)
                    else res.status(200).json(rows)
                })
            }
            else if (err) res.status(500).json({ message: 'Gagal Mencari Hunian' }), console.log(err)
            else res.status(200).json(rows)
        })
    } else if (item == 'User') {
        conn.query(`select * from tbl_user where nama like '${req.query.user}%' and role <> 'Admin'`, (err, rows) => {
            if (err) res.status(500).json({ message: 'Gagal Mencari User' }), console.log(err)
            else res.status(200).json(rows)
        })
    } else if (item == 'Review') {
        conn.query(`select * from tbl_review where date_create like '${req.query.date_create}%'`, (err, rows) => {
            if (err) res.status(500).json({ message: 'Gagal Mencari Hunian' }), console.log(err)
            else res.status(200).json(rows)
        })
    }
})


// Live Chat

app.post('/livechat/add', (req, res) => {
    const { chatId, usernameUser, usernameAdmin, usernameSend, role, message, date, time, status } = req.body
    var queryStr = `INSERT INTO tbl_livechat VALUES ('','${chatId}' ,'${usernameUser}','${usernameAdmin}','${usernameSend}','${role}','${message}', '${date}','${time}','${status}')`;
    conn.query(queryStr, (err, rows) => {
        if (err) { res.status(400).json(err), console.log('Gagal Ditambahkan', err) }
        else { res.status(200).json(rows), console.log('Berhasil Ditambahkan') }
    })
})


app.get('/livechat/list/admin', (req, res) => {
    conn.query(`SELECT tbl_livechat.*, tbl_user.poto , tbl_user.nama FROM tbl_livechat INNER JOIN tbl_user ON tbl_user.username = tbl_livechat.usernameUser WHERE tbl_livechat.id IN (SELECT MAX(tbl_livechat.id) FROM tbl_livechat GROUP BY tbl_livechat.usernameUser)`, (err, rows) => {
        if (err) { res.status(500).json(err) }
        else res.status(200).json(rows)
    })
})

// Delete Chat
app.delete('/livechat/delete/:idChat', (req, res) => {
    conn.query(`delete from tbl_livechat where idChat='${req.params.idChat}'`, (err, rows) => {
        if (err) { res.status(500).json(err) }
        else { res.status(200).json(rows), console.log('Delete Pesan Berhasil') }
    })
})

// Detail Chat
app.get('/livechat/detail/list', (req, res) => {
    if (req.query.role === 'Admin') {
        conn.query(`SELECT * FROM tbl_livechat WHERE usernameUser='${req.query.usernameUser}'`, (err, rows) => {
            if (err) { res.status(500).json(err), console.log(err) }
            else { res.status(200).json(rows), console.log(rows) }
        })
    } else {
        conn.query(`SELECT * FROM tbl_livechat WHERE usernameUser='${req.query.username}'`, (err, rows) => {
            if (err) { res.status(500).json(err), console.log(err) }
            else { res.status(200).json(rows), console.log(rows) }
        })
    }
})

// Edit Status LiveChat
// Update Status chat
app.put('/chat/update/status/livechat/:idChat', (req, res) => {
    conn.query(`update tbl_livechat set status='${req.body.status}' where idChat='${req.params.idChat}'`, (err, rows) => {
        if (err) res.status(500).json({ message: 'Gagal Update Chat' })
        else res.status(200).json({ message: 'Berhasil Update Chat' })
    })
})
// Tambah Admin
app.post('/register/admin', (req, res) => {
    var username = req.body.username
    var password = req.body.password
    var team = req.body.team
    var nama = req.body.nama
    var email = req.body.email
    var alamat = req.body.alamat
    var tel = req.body.tel
    var kota = req.body.kota
    var jk = req.body.jk
    var jenis = 'Admin'
    var poto = ''
    var queryStr = `INSERT INTO tbl_user VALUES ('', '${username}', '${password}','${nama}','${email}','${alamat}','${kota}','${tel}','${jk}','${jenis}','${poto}','${team}','','') `;
    conn.query(queryStr, (err, rows) => {
        if (err) res.status(400).json(err), console.log(err)
        else res.status(200).json(rows)
    })
})

// Get Data Transaksi
app.get('/statistik/data/transaksi', (req, res) => {
    conn.query(`SELECT COUNT(*) as jumlahTransaksi, metode, tgl_transaksi FROM tbl_transaksi GROUP BY tgl_transaksi`, (err, rows) => {
        if (err) res.status(500).json({ message: 'Gagal Mendapatkan Data' })
        else res.status(200).json(rows)
    })
})


// Get Data Kota
app.get('/statistik/data/user/kota', (req, res) => {
    conn.query(`SELECT Count(*) as totalUser ,kota FROM tbl_user WHERE NOT role='admin' GROUP by kota`, (err, rows) => {
        if (err) res.status(500).json({ message: 'Gagal Mendapatkan Data' })
        else res.status(200).json(rows)
    })
})

// Melakukan Koneksi
const server = http.createServer(app);
server.listen(process.env.PORT||8000, () => {
    console.log('Connect With Port 8000')
})
