const n=`nextflow.enable.dsl = 2

process GREET {
    input:
    val name

    output:
    stdout

    script:
    """
    echo "Hello, \${name}!"
    """
}

workflow {
    Channel.of('Ada', 'Grace') | GREET | view
}
`;export{n as default};
