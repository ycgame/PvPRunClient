Client = function(){
    
    var WebSocket = require('websocket').client;
    var _this = this;

    if(process.argv[2] != undefined){
	if(process.argv[2] == 'ai'){
	    this.vsAi = 'ai';
	}else if(process.argv[2] == 'cancel'){
	    this.cancelMode = 'cancel';
	}
    }

    this.readLine = require('readline');

    this.client = new WebSocket();
    
    this.client.on('connectFailed', function(){
	console.log('接続失敗...');
    });

    this.client.on('connect', function(conn){

	console.log('WebSocket接続成功!');

	_this.conn = conn;

	conn.on('message', function(_msg){

	    data = JSON.parse(_msg.utf8Data);
	    msg  = data['message'];
	    
	    if(!('type' in Object(msg))){
		return;
	    }
	    
	    type = msg['type'];

	    if(type == 'auth'){

		console.log('認証情報');

		if(msg['auth']){
		    console.log(' -> 認証成功');
		}else{
		    console.log(' -> 認証失敗');
		    process.exit();
		}

	    }else if(type == 'match'){

		console.log('マッチ情報');

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

	    }else if(type == 'step'){

		console.log('\n相手 ('+msg['step_count']+') -> '+msg['step']);

	    }else if(type == 'fin'){

		console.log('\nゲーム終了！');

		if(msg['fin']){
		    console.log('勝利！');
		}else{
		    console.log('敗北...');
		}

		console.log('勝因 or 敗因: '+msg['msg']);
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

Client.prototype._cancel = function(i){
    data = {}
    data['action'] = 'cancel';
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

Client.prototype.cancel = function(){
    this.conn.sendUTF(this._cancel());
}

Client.prototype.match = function(){

    var _this = this;
    
    this.conn.sendUTF(this._match());

    if(this.vsAi == 'ai'){
	
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
    }else if(this.cancelMode == 'cancel'){

	console.log('3秒後にマッチングをキャンセルします');

	setTimeout(function(){
	    _this.cancel();
	    console.log('キャンセルしました');
	    process.exit();
	}, 3000);
	
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

module.exports = Client;
