<template>
  <div ref="editor"></div>
  <div ref="editor1"></div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { createEditor } from '../../packages/editor/dist/simple';

const editor = ref<HTMLDivElement>();
const editor1 = ref<HTMLDivElement>();

onMounted(async () => {
  const codeEditor1 = await createEditor(editor1.value!, {
    lang: 'javascript',
    theme: 'one-dark-pro',
    code: `    const shiki = await createHighlighter({
      themes: ['vitesse-light'],
      langs: ['javascript', 'ts'],
      engine: createJavaScriptRegexEngine(),
    })

    await shiki.loadLanguage('css')
    await shiki.loadTheme('min-dark')
`
  });

  const codeEditor = await createEditor(editor.value!, {
    useJSEngine: true,
    lang: 'rust',
    theme: 'one-dark-pro',
    code: `extern crate tokio; // 0.1.7
extern crate tokio_fs;

use tokio::io::AsyncRead;
use tokio::prelude::{Async::*, Poll, Stream};
use tokio_fs::Stdin;

pub struct Input {
    stdin: Stdin,
}

impl Stream for Input {
    type Item = usize;
    type Error = ();

    fn poll(&mut self) -> Poll<Option<Self::Item>, Self::Error> {
        let mut buf: [u8; 10] = [0; 10];
        match self.stdin.poll_read(&mut buf) {
            Ok(Ready(bytes_num)) => {
                if bytes_num < 5 {
                    Ok(NotReady)
                } else {
                    Ok(Ready(Some(bytes_num)))
                }
            }
            Ok(NotReady) => Ok(NotReady),
            Err(_) => Err(()),
        }
    }
}

// Either send my name into the channel or receive someone else's, whatever happens first.
fn seek<'a>(name: &'a str, tx: &Sender<&'a str>, rx: &Receiver<&'a str>) {
    select_loop! {
        recv(rx, peer) => println!("{} received a message from {}.", name, peer),
        send(tx, name) => {}, // Wait for someone to receive my message.
    }
}

fn seek<'a>(name: &'a str, tx: &Sender<&'a str>, rx: &Receiver<&'a str>) {
    select_loop! {
        recv(rx, peer) => println!("{} received a message from {}.", name, peer),
        send(tx, name) => {}, // Wait for someone to receive my message.
    }
}

fn seek<'a>(name: &'a str, tx: &Sender<&'a str>, rx: &Receiver<&'a str>) {
    select_loop! {
        recv(rx, peer) => println!("{} received a message from {}.", name, peer),
        send(tx, name) => {}, // Wait for someone to receive my message.
    }
}

fn main() {
    let stdin = tokio_fs::stdin();

    let i = Input { stdin };

    let server = i.for_each(|n| {
        println!("bytes num: {:?}", b);
        Ok(())
    });

    tokio::run(server)
}

// Unlike C/C++, there's no restriction on the order of function definitions
fn main() {
    // We can use this function here, and define it somewhere later
    fizzbuzz_to(100);
}

// Function that returns a boolean value
fn is_divisible_by(lhs: u32, rhs: u32) -> bool {
    // Corner case, early return
    if rhs == 0 {
        return false;
    }

    // This is an expression, the 'return' keyword is not necessary here
    lhs % rhs == 0
}

// Functions that "don't" return a value, actually return the unit type '()'
fn fizzbuzz(n: u32) -> () {
    if is_divisible_by(n, 15) {
        println!("fizzbuzz");
    } else if is_divisible_by(n, 3) {
        println!("fizz");
    } else if is_divisible_by(n, 5) {
        println!("buzz");
    } else {
        println!("{}", n);
    }
}

// Function that returns a boolean value
fn is_divisible_by(lhs: u32, rhs: u32) -> bool {
    // Corner case, early return
    if rhs == 0 {
        return false;
    }

    // This is an expression, the 'return' keyword is not necessary here
    lhs % rhs == 0
}

// Functions that "don't" return a value, actually return the unit type '()'
fn fizzbuzz(n: u32) -> () {
    if is_divisible_by(n, 15) {
        println!("fizzbuzz");
    } else if is_divisible_by(n, 3) {
        println!("fizz");
    } else if is_divisible_by(n, 5) {
        println!("buzz");
    } else {
        println!("{}", n);
    }
}

// When a function returns '()', the return type can be omitted from the
// signature
fn fizzbuzz_to(n: u32) {
    for n in 1..=n {
        fizzbuzz(n);
    }
}

// From https://doc.rust-lang.org/rust-by-example/fn.html`
  });

  setTimeout(() => {
    codeEditor1.setLang('javascript');
    codeEditor1.setTheme('min-dark');

    codeEditor.setLang('rust');
    codeEditor.setTheme('monokai');
  }, 3000);

  // codeEditor.updateCode();
});
</script>

<style scoped></style>
