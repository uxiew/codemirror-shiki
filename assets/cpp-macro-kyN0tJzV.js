const e=`#include <iostream>

#define APP_NAME "语法实验室"
#define SQUARE(x) ((x) * (x))
#define LOG_VALUE(value) \\
  std::cout << #value << " = " << (value) << '\\n'

#if defined(DEBUG) && !defined(NDEBUG)
  #define TRACE(message) std::cerr << "[debug] " << message << '\\n'
#else
  #define TRACE(message) ((void)0)
#endif

int main() {
  LOG_VALUE(SQUARE(7));
  TRACE(APP_NAME);
  return 0;
}
`;export{e as default};
