class ErrorFlash {
	static TARGET_SELECTOR = '#errors';

	static render(error_message) {
		const target = document.querySelector(ErrorFlash.TARGET_SELECTOR);
		target.hidden = false;
		target.addEventListener('click', () => {
			target.hidden = true;
		});
		target.innerHTML = `
			<span class="flash--error">${error_message}</span>
		`;
	}
}

class List {
	static TARGET_SELECTOR = '#lists';
	label;
	list;
	id;
	formatted_list;
	element;

	constructor(data) {
		this.label = data.label;
		if (data.list.some((word) => word.length > 30)) {
			ErrorFlash.render("Il ne faut pas qu'un mot dépasse les 30 caractères.");
		}
		this.set_list(data.list);
		this.id = uuidv4();
		this.build();
		console.group('Creating List');
		console.log('Just creating this :\n', this);
		console.groupEnd();
	}

	render() {
		document.querySelector(List.TARGET_SELECTOR).append(this.element);
	}

	get_as_element() {
		return this.element;
	}

	/**
	 * @returns `{label, list}`
	 */
	get_as_object() {
		return {
			label: this.label,
			list: this.list,
		};
	}

	build() {
		const e = document.createElement('div');

		e.setAttribute('data-id', this.id);

		const label = document.createElement('em');
		label.title = this.label;
		label.textContent = this.label;

		const list = document.createElement('p');
		list.textContent = this.list.join(' | ');

		const label_list_container = document.createElement('div');
		label_list_container.append(label, list);

		const btn_use = document.createElement('button');
		const import_svg = document.createElement('img');
		import_svg.src = '../assets/images/import.svg';
		import_svg.title = 'Utiliser la liste';
		btn_use.append(import_svg);
		btn_use.classList.add('button--secondary', 'button', 'button--svg');
		btn_use.addEventListener('click', () => {
			Utils.insert_list(this);
		});
		btn_use.addEventListener('mouseover', () => {
			e.style.backgroundColor = 'green';
		});
		btn_use.addEventListener('mouseout', () => {
			e.style.backgroundColor = '';
		});

		const btn_delete = document.createElement('button');

		const trash_svg = document.createElement('img');
		trash_svg.src = '../assets/images/trash.svg';
		trash_svg.title = 'Supprimer la liste';

		btn_delete.append(trash_svg);
		btn_delete.classList.add('button--danger', 'button', 'button--svg');
		btn_delete.addEventListener('mouseover', () => {
			e.style.backgroundColor = 'tomato';
		});

		btn_delete.addEventListener('mouseout', () => {
			e.style.backgroundColor = '';
		});
		btn_delete.addEventListener('click', () => {
			if (confirm('Tu es sûr de vouloir supprimer cette liste ?')) Utils.remove_from_sync(this);
		});

		const btn_container = document.createElement('article');
		btn_container.append(btn_use, btn_delete);
		e.append(label_list_container, btn_container);

		this.element = e;
	}

	set_list(list) {
		this.list = list;
		this.formatted_list = list.join(',');
	}

	get_formatted_list() {
		return this.formatted_list;
	}
}

class ListRegistry {
	static lists = [];

	static renderAll() {
		console.group('Render All');
		console.log('Clearing DOM...');
		document.querySelector(List.TARGET_SELECTOR).innerHTML = '';
		ListRegistry.lists.forEach((list) => list.render());
		console.log('Hydrated DOM...');
		console.groupEnd();
	}

	static add(list) {
		console.log('Pushing ...', list);
		ListRegistry.lists.push(list);
	}

	static get() {
		return ListRegistry.lists;
	}

	static get_by_id(list_id) {
		return ListRegistry.lists.find((list) => list.id === list_id);
	}

	static get_by_ref(list_to_find) {
		return ListRegistry.lists.find((list) => list === list_to_find);
	}

	static refresh_list(lists) {
		console.group('Refresh list');
		console.log(lists);

		ListRegistry.lists = lists.map((list) => new List(list));
		chrome.storage.sync.set({ words_lists: ListRegistry.lists });
		ListRegistry.renderAll();

		console.groupEnd();
	}
}

class Utils {
	static insert_list(list) {
		chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
			console.log('Given this :\n', list.id);
			console.log('Get list by reference :\n', ListRegistry.get_by_id(list.id));
			let list_found = ListRegistry.get_by_id(list.id);
			console.log(list_found);
			chrome.tabs.sendMessage(tabs[0].id, { list: list_found }, function (response) {
				console.log('Got response from content :\nj', response);
			});
		});
	}

	static add_to_sync(list) {
		chrome.storage.sync.get(['words_lists'], ({ words_lists }) => {
			words_lists.push(list);
			ListRegistry.refresh_list(words_lists);
		});
	}

	/**
	 *
	 * @param {List} list
	 */
	static remove_from_sync(list) {
		chrome.storage.sync.get(['words_lists'], ({ words_lists }) => {
			console.group('Remove from sync');
			console.log('We have this :\n');
			console.log(words_lists);
			words_lists.splice(
				words_lists.findIndex((l) => l.id === list.id),
				1
			);
			console.log('We want this :\n');
			console.log(words_lists);
			ListRegistry.refresh_list(words_lists);
			console.log('List is refreshed !');
			console.groupEnd();
		});
	}

	static handle_form({ label, list }) {
		if (label.trim() == '' || list.trim() == '') {
			ErrorFlash.render('Il semble y avoir un champs vide...');
			return;
		}
		list = list
			.trim()
			.split(',')
			.map((word) => word.trim())
			.filter((el) => el !== '');

		console.group();
		console.log('Saving this :');
		console.log(label);
		console.log(list);
		console.groupEnd();
		Utils.add_to_sync({ label, list });
	}

	static areEqual(arr1, arr2) {
		let n = arr1.length;
		let m = arr2.length;

		if (n != m) return false;

		let map = new Map();
		let count = 0;
		for (let i = 0; i < n; i++) {
			if (map.get(arr1[i]) == null) map.set(arr1[i], 1);
			else {
				count = map.get(arr1[i]);
				count++;
				map.set(arr1[i], count);
			}
		}

		for (let i = 0; i < n; i++) {
			if (!map.has(arr2[i])) return false;
			if (map.get(arr2[i]) == 0) return false;
			count = map.get(arr2[i]);
			--count;
			map.set(arr2[i], count);
		}

		return true;
	}
}

try {
	chrome.storage.sync.get(['words_lists'], ({ words_lists }) => {
		ListRegistry.refresh_list(words_lists);
	});
} catch (err) {
	ErrorFlash.render(err.message);
}

const form = document.querySelector('#form');
form.addEventListener('submit', (e) => {
	e.preventDefault();
	const label_value = document.querySelector('#list_label').value;
	const list_value = document.querySelector('#list_words').value;
	Utils.handle_form({ label: label_value, list: list_value });
});

function toggle_form_container() {
	forms_container.hidden = forms_container.hidden ? false : true;
	toggle_form.textContent = forms_container.hidden
		? 'Ouvrir le formulaire de création de liste'
		: 'Fermer le formulaire';
}

const forms_container = document.querySelector('#forms_container');
const toggle_form = document.querySelector('#toggle_form');
toggle_form.addEventListener('click', toggle_form_container);

function downloadTextFile(text, name) {
	const a = document.createElement('a');
	const type = name.split('.').pop();
	a.href = URL.createObjectURL(new Blob([text], { type: `text/${type === 'txt' ? 'plain' : type}` }));
	a.download = name;
	a.click();
}

const export_list = document.querySelector('#export_list');
export_list.addEventListener('click', (e) => {
	e.preventDefault();
	chrome.storage.sync.get(['words_lists'], ({ words_lists }) => {
		downloadTextFile(JSON.stringify(words_lists), 'skribbli-' + Date.now() + '.json');
	});
});

const import_list = document.querySelector('#import_list');
const input_files = document.getElementById('selectFiles');
input_files.addEventListener('change', (e) => {
	import_list.hidden = false;
});
import_list.addEventListener('click', (e) => {
	e.preventDefault();
	try {
		var files = input_files.files;
		if (files.length <= 0) {
			return false;
		}
		var fr = new FileReader();

		fr.onload = function (e) {
			var result = JSON.parse(e.target.result);
			chrome.storage.sync.get(['words_lists'], ({ words_lists }) => {
				for (const element of result)
					if (!words_lists.find((el) => Utils.areEqual(el.list, element.list))) words_lists.push(element);
				ListRegistry.refresh_list(words_lists);
			});
			toggle_form_container();
			import_list.hidden = true;
		};

		fr.readAsText(files.item(0));
	} catch (err) {
		ErrorFlash.render(err.message);
	}
});
