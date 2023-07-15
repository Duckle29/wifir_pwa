let settings = {
	'device_id': '', // 123abc
	'mqtt_host': '', // wss://io.adafruit.com:443
	'mqtt_user': '', // User
	'mqtt_pass': '', // aio_xxxxxxxxxxxxx
};

let sub_feeds = [
	'temp',
	'humi',
	// 'eco2',
	// 'tvoc',
	// 'log',
	// 'ir-state'
]

let mqtt_options = {
	// Clean session
	'clean': true,
	'connectTimeout': 4000,

	// Auth
	// clientId
	username: settings['mqtt_user'],
	password: settings['mqtt_pass']
}

let sensor_values = {
	'temp': 0,
	'humi': 0,
	'eco2': 0,
	'tvoc': 0
}


function alert_banner(message, type, timeout = 5000) {
	let type_class = ''

	switch (type) {
		case 'success':
			type_class = 'alert-success'
			svg = 'svg_success'
			break;

		case 'info':
			type_class = 'alert-primary'
			svg = 'svg_info'
			break;

		case 'warn':
			type_class = 'alert-warning'
			svg = 'svg_triangle'
			break;

		case 'fail':
			type_class = 'alert-danger'
			svg = 'svg_triangle'
			break;
	}

	let $div_template = $(`<div  class='alert ${type_class} d-flex align-items-center visually-hidden' role='alert'>
						<svg class='bi flex-shrink-0 me-2' width='24' height='24' role='img' aria-label='Success'><use xlink:href='#${svg}'/></svg>
						<div>${message}</div>
				</div>`)

	$div_template.click(function() {
		$(this).fadeOut('fast', function() {
			$(this).remove();
		})
	})


	$($div_template).fadeOut(10);
	$($div_template).removeClass('visually-hidden');
	$($div_template).fadeIn('slow');

	setTimeout(function() {
		$div_template.fadeOut('slow', function() {
			$div_template.remove();
		})
	}, 5000)

	$('#top_alerts').prepend($div_template)
}


$(document).ready(function() {

	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.register('./sw.js');
	}

	for (let key in settings) {
		idbKeyval.get(key).then((value) => {
			settings[key] = value;
			$(`#${key}`).val(value);
		})
	}

	$('#settings_save').click(function() {
		settings['device_id'] = $('#device_id').val()
		settings['mqtt_host'] = $('#mqtt_host').val()
		settings['mqtt_user'] = $('#mqtt_user').val()
		settings['mqtt_pass'] = $('#mqtt_pass').val()
		console.log(settings)

		let tmp = []
		for (let key in settings) {
			tmp.push([key, settings[key]])
		}

		idbKeyval.setMany(tmp)
			.then(() => console.log('It worked!'))
			.catch((err) => console.log('It failed!', err));

		$('#top_alert').text('Settings saved')
		$('#top_alert').fadeOut(10)
		$('#top_alert').removeClass('visually-hidden')
		$('#top_alert').fadeIn('slow')

		setTimeout(function() {
			$('#top_alert').fadeOut('1000', function() {
				$('#top_alert').addClass('visually-hidden')
				$('#top_alert').text('')
			})

		}, 5000)
	})
})


let client = null

$('#connect_btn').click(function() {
	mqtt_options['username'] = settings['mqtt_user']
	mqtt_options['password'] = settings['mqtt_pass']

	if (client === null) {
		client = mqtt.connect(settings['mqtt_host'], mqtt_options)
		


		client.on('message', function(topic, payload, packet) {
			// Payload is Buffer
			console.log(`Topic: ${topic}, Message: ${payload.toString()}, QoS: ${packet.qos}`)

			Object.entries(sensor_values).forEach((key, value) => {
				if (topic.endsWith(key[0])) {
					sensor_values[key[0]] = parseFloat(payload.toString());
				}
			})

			$('#temp_out').text(sensor_values['temp'])
			$('#humi_out').text(sensor_values['humi'])

		})

		client.on('close', function() {

			$('#connect_btn').fadeIn('fast')
			$('#disconnect_btn').fadeOut('fast')
		})

		client.on('reconnect', function() {

			$('#connect_btn').fadeOut('fast')
			$('#disconnect_btn').fadeIn('fast')
		})

		client.on('connect', function() {
			console.log('Connected to MQTT')

			$('#connect_btn').fadeOut('fast')
			$('#disconnect_btn').fadeIn('fast')

			alert_banner('Connected', 'success')

			let feeds = ''
			feeds = sub_feeds
			for (let i = 0; i < feeds.length; i++) {
				feeds[i] = `device/feeds/wifir-${settings['device_id']}-${feeds[i]}`
			}

			client.subscribe(feeds, {
				qos: 0
			}, function(error, granted) {
				if (error) {
					console.log(error)
				} else {
					granted.forEach(element => {
						console.log(`${element.topic} was subscribed`)
					});
				}
			})

			client.publish(`device/feeds/wifir-${settings['device_id']}-config`, 'get_sensors', {
				qos: 0,
				retain: false
			}, function(error) {
				if (error) {
					console.log(error)
				} else {
					console.log('requested_sensors')
				}
			})
		})
	} else {
		client.reconnect()
	}
})

$('#disconnect_btn').click(function(){
	if (client === null) {
		console.log('shrug')
	} else {
		client.end()
	}
})

let cmd_lut = {
	'M': {
		'heat': 'Heat',
		'cool': 'Cool',
		'auto': 'Auto'
	},
	'P': {
		'on': 'On',
		'off': 'Off'
	},
	'T': ''
}

function set_state(cmd) {
	client.publish(`device/feeds/wifir-${settings['device_id']}-set-state`, cmd, {
		qos: 0,
		retain: false
	}, function(error) {
		if (error) {
			console.log(error)
		} else {
			console.log(`set state: ${cmd}`)
		}
	})
}

$('#on_btn').click(function(){
	console.log('on')
	let mode = $('#mode_select').val()
	let temp = parseFloat($('#temp_in').val())

	cmd = `P=${cmd_lut['P']['on']}:M=${cmd_lut['M'][mode]}:T=${temp.toFixed(1)}:`
	console.log(cmd)
	set_state(cmd)
})

$('#off_btn').click(function(){
	console.log('off')
	cmd = `P=${cmd_lut['P']['off']}:`
	console.log(cmd)
	set_state(cmd)
})
