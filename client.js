
Client = function(){

    var WebSocket = require('websocket').client;
    var _this = this;

    this.readLine = require('readline');

    this.client = new WebSocket();
    
    this.client.on('connectFailed', function(){
	console.log(' * 接続失敗 * ');
    });

    this.client.on('connect', function(conn){

	console.log('WebSocket接続成功!');

	_this.conn = conn;

	conn.on('message', function(_msg){

	    data = JSON.parse(_msg.utf8Data);
	    msg  = data['message'];

	    if('auth' in Object(msg)){

		console.log('認証情報');

		if(msg['auth']){
		    console.log(' -> 認証成功');
		}else{
		    console.log(' -> 認証失敗');
		}

	    }else if('match' in Object(msg)){

		console.log('マッチ情報');

		if(msg['match']){

		    console.log(' -> マッチ相手が見つかりました！');
		    console.log(' -> ステージ: '+msg['stage']);
		    console.log(' -> 自分の情報');
		    console.log('    名前: '+msg['user']['name']);
		    console.log('    レート: '+msg['user']['rate']);
		    console.log(' -> 相手の情報');
		    console.log('    名前: '+msg['matched']['name']);
		    console.log('    レート: '+msg['matched']['rate']);

		    _this.stage = msg['stage'];
		    _this.stepCount = 0;
		    _this.step();
		}else{
		    console.log(' -> 認証失敗');
		    process.exit();
		}

	    }else if('step' in Object(msg)){

		console.log('\n相手 ('+msg['step_count']+') -> '+msg['step']);

	    }else if('fin' in Object(msg)){

		console.log('\nゲーム終了！');

		if(msg['fin']){
		    console.log('勝利！');
		}else{
		    console.log('敗北...');
		}

		console.log('レートが'+msg['user']['rate']+'になりました');
		process.exit();
	    }
	});

	_this.subscribe();

	setTimeout(function(){
	    console.log('マッチ待機中...');
	    _this.match();
	}, 500);
    });
}

Client.prototype._channel = function(){
    channel = {};
    channel['channel'] = 'MatchChannel';
    return JSON.stringify(channel);
}

Client.prototype._subscribe = function(){
    command = {};
    command['command'] = 'subscribe';
    command['identifier'] = this._channel();
    return JSON.stringify(command);
}

Client.prototype._match = function(){

    data = {};
    data['action'] = 'match';
    data['id'] = this.id;
    data['token'] = this.token;

    command = {};
    command['command'] = 'message';
    command['identifier'] = this._channel();
    command['data'] = JSON.stringify(data);
    return JSON.stringify(command);
}

Client.prototype._step = function(i){
    data = {}
    data['action'] = 'step';
    data['step'] = i;
    command = {}
    command['command'] = 'message';
    command['identifier'] = this._channel();
    command['data'] = JSON.stringify(data);
    return JSON.stringify(command);
}

Client.prototype.login = function(){
    
    this.readLineSync = require('readline-sync');

    this.id = this.readLineSync.question('id ?\n> ');
    this.token = this.readLineSync.question('token ?\n> ');
}

Client.prototype.connect = function(){
    this.client.connect('ws://localhost:3000/cable');
}

Client.prototype.subscribe = function(){
    this.conn.sendUTF(this._subscribe());
}

Client.prototype.match = function(){

    var _this = this;

    this.readLineSync = require('readline-sync');
    this.mode = this.readLineSync.question(
	'AIとマッチングするときは ai と入力してください\n'+
	    'すでにマッチングを待機しているプレイヤーがいたらそちらが優先されます\n> ');
    
    this.conn.sendUTF(this._match());

    if(this.mode == 'ai'){
	
	var request = require('request');
	var options = {
	    uri: 'http://localhost:3000/ais',
	    method: 'POST',
	    json: true,
	    body: {token: process.env.AI_TOKEN}
	};
	
	request.post(options, function(error, response, body){
	    if(!error && response.statusCode == 200){
		console.log('AI対戦リクエストを送信しました');
	    }else{
		console.log('エラーです');
		console.log(response);
		console.log(error);
		console.log(body);
	    }
	});
    }else{
	console.log('対戦リクエストを受け付けています...');
    }
}

Client.prototype.step = function(){

    var _this = this;

    console.log('正しいステップ: '+this.stage[this.stepCount]);

    this.i = this.readLine.createInterface(process.stdin, process.stdout, null);
    this.i.question('ステップ ?\n> ', function(answer){

	_this.conn.sendUTF(_this._step(answer));
	_this.stepCount ++;
	_this.i.close();

	if(_this.stepCount < _this.stage.length){
	    _this.step();
	}
    });
};

client = new Client();
client.login();
client.connect();
