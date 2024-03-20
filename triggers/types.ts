export interface Config {
    name: string;
    type: string;
    path: string;
    command: string;
    args: string[];
}

export interface Context {
    log: {
		info: (message: string) => void;
		error: (message: string) => void;
		debug: (message: string) => void;
	},
	
}

