import * as EvenEmitter from 'events';

class SS extends EvenEmitter {

}

let s = new SS();

s.on('test', () => {
    console.log('listener 1');
}).on('test', () => {
    console.log('listener 2');
});


s.emit('test');