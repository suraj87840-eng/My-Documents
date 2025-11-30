const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname + '/public'));

let teacherSocket = null;
const waitingStudents = []; // {id}
const students = new Set();
const MAX_STUDENTS = 200; // for demo, adjust

io.on('connection', socket => {
  console.log('conn', socket.id);

  socket.on('teacher-join', () => {
    teacherSocket = socket.id;
    console.log('Teacher joined:', teacherSocket);
    io.to(teacherSocket).emit('teacher-ready');
  });

  socket.on('student-join', () => {
    console.log('student join request', socket.id);
    if (!teacherSocket) {
      // no teacher yet, still allow to wait
      waitingStudents.push(socket.id);
      socket.emit('waiting', { reason: 'no_teacher' });
      return;
    }
    if (students.size >= MAX_STUDENTS) {
      waitingStudents.push(socket.id);
      socket.emit('waiting', { reason: 'full' });
      return;
    }
    // notify teacher of new waiting student
    io.to(teacherSocket).emit('student-waiting', { id: socket.id });
    socket.emit('waiting', { reason: 'pending' });
  });

  socket.on('teacher-accept', ({ studentId }) => {
    if (!io.sockets.sockets.get(studentId)) return;
    // mark student allowed
    students.add(studentId);
    // notify student to start signaling (teacher will create offer)
    io.to(studentId).emit('accepted', { teacherId: teacherSocket });
    // tell teacher to create offer for this student (includes studentId)
    io.to(teacherSocket).emit('create-offer', { studentId });
    console.log('teacher accepted', studentId);
  });

  // Signaling: teacher sends offer to student (server simply forwards)
  socket.on('offer', ({ studentId, sdp }) => {
    if (io.sockets.sockets.get(studentId)) {
      io.to(studentId).emit('offer', { sdp, teacherId: socket.id });
    }
  });

  socket.on('answer', ({ teacherId, sdp }) => {
    if (io.sockets.sockets.get(teacherId)) {
      io.to(teacherId).emit('answer', { sdp, studentId: socket.id });
    }
  });

  socket.on('ice-candidate', ({ targetId, candidate }) => {
    if (io.sockets.sockets.get(targetId)) {
      io.to(targetId).emit('ice-candidate', { from: socket.id, candidate });
    }
  });

  // Raise hand -> notify teacher
  socket.on('raise-hand', () => {
    if (teacherSocket) io.to(teacherSocket).emit('raised-hand', { studentId: socket.id });
  });

  // Chat
  socket.on('chat', (msg) => {
    // broadcast to teacher + students in classroom
    if (teacherSocket) io.to(teacherSocket).emit('chat', { from: socket.id, msg });
    // also broadcast to all students currently accepted
    students.forEach(sid => {
      io.to(sid).emit('chat', { from: socket.id, msg });
    });
  });

  socket.on('disconnect', () => {
    console.log('disconnect', socket.id);
    // remove from waiting/students
    const wi = waitingStudents.indexOf(socket.id);
    if (wi !== -1) waitingStudents.splice(wi, 1);
    if (students.has(socket.id)) students.delete(socket.id);
    // notify teacher to remove waiting if needed
    if (teacherSocket) io.to(teacherSocket).emit('student-disconnected', { id: socket.id });
    if (socket.id === teacherSocket) {
      teacherSocket = null;
      // notify all students teacher left
      students.forEach(sid => {
        io.to(sid).emit('teacher-left');
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on port', PORT));
